import { queryFirst, runQuery } from '../db';
import { Trainer } from '../../types';

export const trainerService = {
  async getProfile(): Promise<Trainer | null> {
    const row = await queryFirst<any>('SELECT * FROM trainers LIMIT 1;');
    if (!row) return null;
    return {
      ...row,
      age: row.age != null ? Number(row.age) : undefined,
      biometric_enabled: Boolean(row.biometric_enabled),
    };
  },

  async saveProfile(profile: Omit<Trainer, 'created_at'>): Promise<Trainer> {
    const existing = await this.getProfile();
    const now = new Date().toISOString();

    if (existing) {
      await runQuery(
        `UPDATE trainers
         SET name = ?, first_name = ?, last_name = ?, title = ?, role = ?, age = ?,
             email = ?, phone = ?, address = ?, pin_hash = ?, biometric_enabled = ?, avatar_uri = ?
         WHERE id = ?;`,
        [
          profile.name,
          profile.first_name || null,
          profile.last_name || null,
          profile.title || null,
          profile.role || null,
          profile.age != null ? profile.age : null,
          profile.email || null,
          profile.phone || null,
          profile.address || null,
          profile.pin_hash !== undefined ? (profile.pin_hash || null) : (existing.pin_hash || null),
          profile.biometric_enabled ? 1 : 0,
          profile.avatar_uri || null,
          existing.id,
        ]
      );
      return {
        ...profile,
        id: existing.id,
        created_at: existing.created_at,
      };
    } else {
      const id = profile.id || `tr_${Date.now()}`;
      await runQuery(
        `INSERT INTO trainers (id, name, first_name, last_name, title, role, age, email, phone, address, pin_hash, biometric_enabled, avatar_uri, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          profile.name,
          profile.first_name || null,
          profile.last_name || null,
          profile.title || null,
          profile.role || null,
          profile.age != null ? profile.age : null,
          profile.email || null,
          profile.phone || null,
          profile.address || null,
          profile.pin_hash || null,
          profile.biometric_enabled ? 1 : 0,
          profile.avatar_uri || null,
          now,
        ]
      );
      return {
        ...profile,
        id,
        created_at: now,
      };
    }
  },

  async updatePin(newPin: string): Promise<void> {
    await runQuery('UPDATE trainers SET pin_hash = ?;', [newPin.trim()]);
  },

  async removePin(): Promise<void> {
    await runQuery('UPDATE trainers SET pin_hash = NULL;');
  },

  async verifyPin(enteredPin: string): Promise<boolean> {
    const profile = await this.getProfile();
    if (!profile || !profile.pin_hash) return true; // PIN not set
    return profile.pin_hash.trim() === enteredPin.trim();
  },
};
