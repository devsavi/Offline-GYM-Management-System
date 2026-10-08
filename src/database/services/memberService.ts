import { queryAll, queryFirst, runQuery } from '../db';
import { Member, MemberSummaryStats } from '../../types';

export const memberService = {
  /**
   * Fetch members strictly scoped to a specific location.
   */
  async getMembersByLocation(
    locationId: string,
    searchQuery: string = '',
    statusFilter: 'all' | 'active' | 'inactive' = 'all'
  ): Promise<Member[]> {
    let sql = `
      SELECT m.*,
        (
          SELECT p.status
          FROM payments p
          WHERE p.member_id = m.id
          ORDER BY COALESCE(p.start_date, p.due_date) DESC, p.created_at DESC
          LIMIT 1
        ) as latest_payment_status
      FROM members m
      WHERE m.location_id = ?
    `;
    const params: (string | number | null)[] = [locationId];

    if (statusFilter !== 'all') {
      sql += ' AND m.status = ?';
      params.push(statusFilter);
    }

    if (searchQuery.trim().length > 0) {
      sql += ' AND (m.name LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)';
      const wildcard = `%${searchQuery.trim()}%`;
      params.push(wildcard, wildcard, wildcard);
    }

    sql += ' ORDER BY m.name COLLATE NOCASE ASC;';

    const rows = await queryAll<any>(sql, params);
    return rows.map((r) => ({
      ...r,
      age: r.age ? Number(r.age) : undefined,
      status: r.status as 'active' | 'inactive',
      latest_payment_status: r.latest_payment_status ? (r.latest_payment_status as any) : 'no_plan',
    }));
  },

  async getMemberById(id: string): Promise<Member | null> {
    const row = await queryFirst<any>(
      `SELECT m.*,
        (
          SELECT p.status
          FROM payments p
          WHERE p.member_id = m.id
          ORDER BY COALESCE(p.start_date, p.due_date) DESC, p.created_at DESC
          LIMIT 1
        ) as latest_payment_status
       FROM members m
       WHERE m.id = ?;`,
      [id]
    );

    if (!row) return null;
    return {
      ...row,
      age: row.age ? Number(row.age) : undefined,
      status: row.status as 'active' | 'inactive',
      latest_payment_status: row.latest_payment_status ? (row.latest_payment_status as any) : 'no_plan',
    };
  },

  async createMember(data: Omit<Member, 'id' | 'created_at' | 'updated_at'>): Promise<Member> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO members (
        id, location_id, title, name, age, dob, gender, phone, email, address,
        emergency_contact, injuries, fitness_goals, status, photo_uri, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.location_id,
        data.title?.trim() ?? null,
        data.name.trim(),
        data.age ?? null,
        data.dob ?? null,
        data.gender ?? 'male',
        data.phone?.trim() ?? null,
        data.email?.trim() ?? null,
        data.address?.trim() ?? null,
        data.emergency_contact?.trim() ?? null,
        data.injuries?.trim() ?? null,
        data.fitness_goals?.trim() ?? null,
        data.status || 'active',
        data.photo_uri ?? null,
        now,
        now,
      ]
    );

    return {
      id,
      ...data,
      created_at: now,
      updated_at: now,
    };
  },

  async updateMember(id: string, data: Partial<Member>): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    const allowedKeys: (keyof Member)[] = [
      'title', 'name', 'age', 'dob', 'gender', 'phone', 'email', 'address',
      'emergency_contact', 'injuries', 'fitness_goals', 'status', 'photo_uri'
    ];

    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key] as any);
      }
    }

    fields.push('updated_at = ?');
    params.push(now);

    params.push(id);
    const sql = `UPDATE members SET ${fields.join(', ')} WHERE id = ?;`;
    await runQuery(sql, params);
  },

  async deleteMember(id: string): Promise<void> {
    await runQuery('DELETE FROM members WHERE id = ?;', [id]);
  },

  /**
   * Fast summary KPIs for the location dashboard
   */
  async getLocationSummaryStats(locationId: string): Promise<MemberSummaryStats> {
    const totalRow = await queryFirst<{ total: number; active: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
       FROM members
       WHERE location_id = ?;`,
      [locationId]
    );

    const todayDatePrefix = new Date().toISOString().split('T')[0];
    const checkInsRow = await queryFirst<{ count: number }>(
      `SELECT COUNT(DISTINCT member_id) as count
       FROM check_ins
       WHERE location_id = ? AND check_in_time LIKE ?;`,
      [locationId, `${todayDatePrefix}%`]
    );

    const pendingPaymentsRow = await queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM payments
       WHERE location_id = ? AND status != 'paid';`,
      [locationId]
    );

    return {
      totalMembers: Number(totalRow?.total || 0),
      activeMembers: Number(totalRow?.active || 0),
      checkedInToday: Number(checkInsRow?.count || 0),
      pendingPaymentsCount: Number(pendingPaymentsRow?.count || 0),
    };
  },
};
