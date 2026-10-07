import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { DEFAULT_EXERCISES } from './seedData';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabaseAsync('gripstate.db');
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  console.log('[SQLite] Opening database...');
  const db = await getDatabase();

  try {
    // 1. Enable Foreign Key Constraints
    await db.execAsync('PRAGMA foreign_keys = ON;');
  } catch (e) {
    console.warn('[SQLite] PRAGMA foreign_keys warning:', e);
  }

  // 2. Create Relational Tables & Indexes
  console.log('[SQLite] Executing schema creation...');
  await db.execAsync(CREATE_TABLES_SQL);
  console.log('[SQLite] Schema created successfully.');

  // Safe migration for additional trainer columns
  try {
    await db.runAsync('ALTER TABLE trainers ADD COLUMN title TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE trainers ADD COLUMN age INTEGER;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE trainers ADD COLUMN address TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE trainers ADD COLUMN first_name TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE trainers ADD COLUMN last_name TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE trainers ADD COLUMN role TEXT;');
  } catch {}

  // 3. Seed Pre-populated Exercises Dictionary atomically
  try {
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM exercises;'
    );

    if (!existing || existing.count === 0) {
      console.log(`[SQLite] Seeding ${DEFAULT_EXERCISES.length} exercises into dictionary...`);
      await db.withTransactionAsync(async () => {
        for (const ex of DEFAULT_EXERCISES) {
          await db.runAsync(
            `INSERT OR IGNORE INTO exercises (id, name, category, description, is_custom)
             VALUES (?, ?, ?, ?, 0);`,
            [ex.id, ex.name, ex.category, ex.description || '']
          );
        }
      });
      console.log(`[SQLite] Successfully seeded ${DEFAULT_EXERCISES.length} exercises.`);
    } else {
      console.log(`[SQLite] Exercise dictionary already populated (${existing.count} exercises).`);
    }
  } catch (seedErr) {
    console.error('[SQLite] Exercise seeding warning:', seedErr);
  }

  console.log('[SQLite] Offline database fully initialized.');
}

export async function queryAll<T>(sql: string, params: (string | number | null)[] = []): Promise<T[]> {
  const db = await getDatabase();
  return await db.getAllAsync<T>(sql, params);
}

export async function queryFirst<T>(sql: string, params: (string | number | null)[] = []): Promise<T | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<T>(sql, params);
  return row ?? null;
}

export async function runQuery(
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLite.SQLiteRunResult> {
  const db = await getDatabase();
  return await db.runAsync(sql, params);
}

export async function withTransaction<T>(
  action: (txDb: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  let result: T;
  await db.withTransactionAsync(async () => {
    result = await action(db);
  });
  return result!;
}

export async function clearAllDatabaseData(): Promise<void> {
  const db = await getDatabase();
  try {
    await db.execAsync(`
      DELETE FROM check_ins;
      DELETE FROM payments;
      DELETE FROM plan_exercises;
      DELETE FROM workout_plans;
      DELETE FROM measurements;
      DELETE FROM custom_measurement_fields;
      DELETE FROM members;
      DELETE FROM locations;
      DELETE FROM trainers;
    `);
    console.log('[SQLite] All application data cleared successfully.');
  } catch (e) {
    console.error('[SQLite] Error clearing database:', e);
  }
}
