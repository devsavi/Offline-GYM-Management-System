import { queryAll, runQuery } from '../db';
import { CheckIn } from '../../types';

export const checkInService = {
  /**
   * Record a check-in visit for a member.
   */
  async recordCheckIn(memberId: string, locationId: string, notes?: string): Promise<CheckIn> {
    const id = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO check_ins (id, member_id, location_id, check_in_time, notes)
       VALUES (?, ?, ?, ?, ?);`,
      [id, memberId, locationId, now, notes?.trim() || null]
    );

    return {
      id,
      member_id: memberId,
      location_id: locationId,
      check_in_time: now,
      notes,
    };
  },

  /**
   * Get all check-ins today for a given location.
   */
  async getTodayCheckIns(locationId: string): Promise<CheckIn[]> {
    const today = new Date().toISOString().split('T')[0];
    const rows = await queryAll<any>(
      `SELECT c.*, m.name as member_name
       FROM check_ins c
       JOIN members m ON c.member_id = m.id
       WHERE c.location_id = ? AND c.check_in_time LIKE ?
       ORDER BY c.check_in_time DESC;`,
      [locationId, `${today}%`]
    );
    return rows;
  },

  /**
   * Get check-in history for a specific member.
   */
  async getMemberCheckInHistory(memberId: string, limit: number = 30): Promise<CheckIn[]> {
    const rows = await queryAll<any>(
      `SELECT * FROM check_ins
       WHERE member_id = ?
       ORDER BY check_in_time DESC
       LIMIT ?;`,
      [memberId, limit]
    );
    return rows;
  },
};
