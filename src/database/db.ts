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
  try {
    await db.runAsync('ALTER TABLE members ADD COLUMN title TEXT;');
  } catch {}

  // Safe migrations for payments table
  try {
    await db.runAsync('ALTER TABLE payments ADD COLUMN plan_id TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE payments ADD COLUMN plan_name TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE payments ADD COLUMN start_date TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE payments ADD COLUMN end_date TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE payments ADD COLUMN payer_member_id TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE payments ADD COLUMN payer_member_name TEXT;');
  } catch {}
  try {
    await db.runAsync('ALTER TABLE payments ADD COLUMN covered_member_ids TEXT;');
  } catch {}

  // Safe index creation on migrated columns
  try {
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_payments_plan ON payments(plan_id);');
  } catch {}
  try {
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_member_id);');
  } catch {}

  // Safe column migration for exercises table
  try {
    await db.runAsync('ALTER TABLE exercises ADD COLUMN image_uri TEXT;');
  } catch {}
  try {
    await db.runAsync(
      `UPDATE exercises SET image_uri = '/exercises/chest/barbell_bench_press.webp' WHERE (id = 'ex_ch_1' OR (LOWER(name) LIKE '%bench press%' AND LOWER(category) = 'chest')) AND (image_uri IS NULL OR image_uri = '' OR image_uri = '/exercises/chest/bench_press.svg');`
    );
    // Clear the bench_press image from any non-chest exercises that may have had it set incorrectly
    await db.runAsync(
      `UPDATE exercises SET image_uri = NULL WHERE LOWER(name) LIKE '%bench press%' AND LOWER(category) != 'chest' AND image_uri = '/exercises/chest/barbell_bench_press.webp';`
    );
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
            `INSERT OR IGNORE INTO exercises (id, name, category, description, is_custom, image_uri)
             VALUES (?, ?, ?, ?, 0, ?);`,
            [ex.id, ex.name, ex.category, ex.description || '', (ex as any).image_uri || null]
          );
        }
      });
      console.log(`[SQLite] Successfully seeded ${DEFAULT_EXERCISES.length} exercises.`);
    } else {
      console.log(`[SQLite] Exercise dictionary already populated (${existing.count} exercises).`);
      
      // Migrate old cardio exercises to new ones
      try {
        console.log('[SQLite] Migrating cardio exercises to new set...');
        await db.runAsync('PRAGMA foreign_keys = OFF;');
        await db.withTransactionAsync(async () => {
          // Delete old cardio exercises (only if they are not custom and have old IDs)
          const oldCardioIds = ['ex_cd_1', 'ex_cd_2', 'ex_cd_3', 'ex_cd_4'];
          for (const oldId of oldCardioIds) {
            // First, remove any plan_exercises references
            await db.runAsync(
              'DELETE FROM plan_exercises WHERE exercise_id = ?;',
              [oldId]
            );
            // Then delete the exercise itself
            await db.runAsync(
              'DELETE FROM exercises WHERE id = ? AND is_custom = 0;',
              [oldId]
            );
          }
          
          // Insert new cardio exercises
          const newCardioExercises = DEFAULT_EXERCISES.filter(ex => ex.category === 'Cardio');
          for (const ex of newCardioExercises) {
            await db.runAsync(
              `INSERT OR REPLACE INTO exercises (id, name, category, description, is_custom, image_uri)
               VALUES (?, ?, ?, ?, 0, ?);`,
              [ex.id, ex.name, ex.category, ex.description || '', (ex as any).image_uri || null]
            );
          }
        });
        await db.runAsync('PRAGMA foreign_keys = ON;');
        console.log('[SQLite] Cardio exercises migrated successfully.');
      } catch (migrateErr) {
        await db.runAsync('PRAGMA foreign_keys = ON;').catch(() => {});
        console.warn('[SQLite] Cardio exercise migration warning:', migrateErr);
      }

      // Migrate old chest exercises to new ones
      try {
        console.log('[SQLite] Migrating chest exercises to new set...');
        // Disable FK checks for this migration to avoid RESTRICT constraint
        // firing before we can clean up plan_exercises references
        await db.runAsync('PRAGMA foreign_keys = OFF;');
        await db.withTransactionAsync(async () => {
          // Remove old chest exercises (ex_ch_2 to ex_ch_5), keep ex_ch_1 (Barbell Bench Press)
          const oldChestIds = ['ex_ch_2', 'ex_ch_3', 'ex_ch_4', 'ex_ch_5'];
          for (const oldId of oldChestIds) {
            await db.runAsync('DELETE FROM plan_exercises WHERE exercise_id = ?;', [oldId]);
            await db.runAsync('DELETE FROM exercises WHERE id = ? AND is_custom = 0;', [oldId]);
          }
          // Insert all current chest exercises (includes new ex_ch_2 through ex_ch_6)
          const newChestExercises = DEFAULT_EXERCISES.filter(ex => ex.category === 'Chest');
          for (const ex of newChestExercises) {
            await db.runAsync(
              `INSERT OR REPLACE INTO exercises (id, name, category, description, is_custom, image_uri)
               VALUES (?, ?, ?, ?, 0, ?);`,
              [ex.id, ex.name, ex.category, ex.description || '', (ex as any).image_uri || null]
            );
          }
        });
        await db.runAsync('PRAGMA foreign_keys = ON;');
        console.log('[SQLite] Chest exercises migrated successfully.');
      } catch (migrateErr) {
        await db.runAsync('PRAGMA foreign_keys = ON;').catch(() => {});
        console.warn('[SQLite] Chest exercise migration warning:', migrateErr);
      }    }
  } catch (seedErr) {
    console.error('[SQLite] Exercise seeding warning:', seedErr);
  }

  // Clean up any previously auto-seeded default plans so payment plans start empty
  try {
    await db.runAsync(
      `DELETE FROM payment_plans WHERE id IN ('plan_monthly', 'plan_3months', 'plan_family_2', 'plan_family_5', 'plan_1year');`
    );
  } catch {}

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
      DELETE FROM payment_plans;
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

