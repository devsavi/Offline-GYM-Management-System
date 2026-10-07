import { queryAll, queryFirst, runQuery } from '../db';
import { Location } from '../../types';

export const locationService = {
  async getAllLocations(): Promise<Location[]> {
    const rows = await queryAll<any>(`
      SELECT l.*, COUNT(m.id) as member_count
      FROM locations l
      LEFT JOIN members m ON l.id = m.location_id
      GROUP BY l.id
      ORDER BY l.created_at ASC;
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      address: r.address,
      created_at: r.created_at,
      member_count: Number(r.member_count || 0),
    }));
  },

  async getLocationById(id: string): Promise<Location | null> {
    const row = await queryFirst<Location>(
      'SELECT * FROM locations WHERE id = ?;',
      [id]
    );
    return row;
  },

  async createLocation(name: string, description?: string, address?: string): Promise<Location> {
    const id = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO locations (id, name, description, address, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [id, name.trim(), description?.trim() || null, address?.trim() || null, now]
    );

    return {
      id,
      name: name.trim(),
      description,
      address,
      created_at: now,
      member_count: 0,
    };
  },

  async updateLocation(id: string, name: string, description?: string, address?: string): Promise<void> {
    await runQuery(
      `UPDATE locations
       SET name = ?, description = ?, address = ?
       WHERE id = ?;`,
      [name.trim(), description?.trim() || null, address?.trim() || null, id]
    );
  },

  async deleteLocation(id: string): Promise<void> {
    await runQuery('DELETE FROM locations WHERE id = ?;', [id]);
  },
};
