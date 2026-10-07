import { queryAll, queryFirst, runQuery } from '../db';
import { Payment, PaymentStatus } from '../../types';

export const paymentService = {
  /**
   * Get all payments for a member.
   */
  async getMemberPayments(memberId: string): Promise<Payment[]> {
    const rows = await queryAll<any>(
      `SELECT * FROM payments
       WHERE member_id = ?
       ORDER BY due_date DESC;`,
      [memberId]
    );
    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
    }));
  },

  /**
   * Get payments for a location filtered by status (paid, unpaid, pending).
   */
  async getLocationPayments(
    locationId: string,
    statusFilter?: PaymentStatus
  ): Promise<Payment[]> {
    let sql = `
      SELECT p.*, m.name as member_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      WHERE p.location_id = ?
    `;
    const params: string[] = [locationId];

    if (statusFilter) {
      sql += ' AND p.status = ?';
      params.push(statusFilter);
    }
    sql += ' ORDER BY p.due_date DESC;';

    const rows = await queryAll<any>(sql, params);
    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
    }));
  },

  /**
   * Create a new billing / fee entry (monthly or yearly).
   */
  async createPayment(
    data: Omit<Payment, 'id' | 'created_at' | 'member_name'>
  ): Promise<Payment> {
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO payments (
        id, member_id, location_id, amount, currency,
        period_type, period_label, due_date, payment_date,
        status, payment_method, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.member_id,
        data.location_id,
        data.amount,
        data.currency || 'USD',
        data.period_type,
        data.period_label,
        data.due_date,
        data.payment_date || null,
        data.status || 'unpaid',
        data.payment_method || null,
        data.notes || null,
        now,
      ]
    );

    return {
      id,
      ...data,
      created_at: now,
    };
  },

  /**
   * Mark a payment as Paid / Unpaid / Pending.
   */
  async updateStatus(
    paymentId: string,
    status: PaymentStatus,
    paymentMethod?: string
  ): Promise<void> {
    const paymentDate = status === 'paid' ? new Date().toISOString() : null;
    await runQuery(
      `UPDATE payments
       SET status = ?, payment_date = ?, payment_method = COALESCE(?, payment_method)
       WHERE id = ?;`,
      [status, paymentDate, paymentMethod || null, paymentId]
    );
  },
};
