import { queryAll, queryFirst, runQuery } from '../db';
import { Payment, PaymentStatus, PaymentPeriod } from '../../types';

export interface AssignPlanParams {
  memberId: string;
  locationId: string;
  planId?: string;
  planName: string;
  amount: number;
  currency: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  periodType: PaymentPeriod;
  status: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
  primaryMemberName: string;
  coveredMembers?: { id: string; name: string }[];
}

export const paymentService = {
  /**
   * Get all payments for a member.
   */
  async getMemberPayments(memberId: string): Promise<Payment[]> {
    const rows = await queryAll<any>(
      `SELECT * FROM payments
       WHERE member_id = ?
       ORDER BY COALESCE(start_date, due_date) DESC, created_at DESC;`,
      [memberId]
    );
    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
    }));
  },

  /**
   * Get active or latest plan/payment for a member.
   */
  async getMemberActivePlan(memberId: string): Promise<Payment | null> {
    const today = new Date().toISOString().split('T')[0];
    // First try to find a paid plan covering today
    let row = await queryFirst<any>(
      `SELECT * FROM payments
       WHERE member_id = ? AND status = 'paid' AND (end_date IS NULL OR end_date >= ?)
       ORDER BY end_date DESC, created_at DESC
       LIMIT 1;`,
      [memberId, today]
    );

    // If none, get the latest payment record
    if (!row) {
      row = await queryFirst<any>(
        `SELECT * FROM payments
         WHERE member_id = ?
         ORDER BY COALESCE(start_date, due_date) DESC, created_at DESC
         LIMIT 1;`,
        [memberId]
      );
    }

    if (!row) return null;
    return {
      ...row,
      amount: Number(row.amount),
    };
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

    if (statusFilter && statusFilter !== 'no_plan') {
      sql += ' AND p.status = ?';
      params.push(statusFilter);
    }
    sql += ' ORDER BY COALESCE(p.start_date, p.due_date) DESC, p.created_at DESC;';

    const rows = await queryAll<any>(sql, params);
    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
    }));
  },

  /**
   * Create a standard single billing / fee entry.
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
        status, payment_method, notes,
        plan_id, plan_name, start_date, end_date,
        payer_member_id, payer_member_name, covered_member_ids,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.member_id,
        data.location_id,
        data.amount,
        data.currency || 'LKR',
        data.period_type,
        data.period_label,
        data.due_date,
        data.payment_date || null,
        data.status || 'unpaid',
        data.payment_method || null,
        data.notes || null,
        data.plan_id || null,
        data.plan_name || null,
        data.start_date || null,
        data.end_date || null,
        data.payer_member_id || data.member_id,
        data.payer_member_name || null,
        data.covered_member_ids || null,
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
   * Assign a custom plan to a member with clear start and end dates.
   * If covered members (e.g. family package) are included, linked records
   * are created so those members are recognized as active & paid under this package.
   */
  async assignPlanToMember(params: AssignPlanParams): Promise<Payment> {
    const now = new Date().toISOString();
    const primaryId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentDate = params.status === 'paid' ? now : null;
    const coveredIds = (params.coveredMembers || []).map((m) => m.id);
    const coveredNames = (params.coveredMembers || []).map((m) => m.name).join(', ');

    let notesText = params.notes?.trim() || '';
    if (coveredNames) {
      notesText = notesText
        ? `${notesText} (Covers: ${coveredNames})`
        : `Covers family members: ${coveredNames}`;
    }

    // 1. Insert Primary Member Payment Record
    await runQuery(
      `INSERT INTO payments (
        id, member_id, location_id, amount, currency,
        period_type, period_label, due_date, payment_date,
        status, payment_method, notes,
        plan_id, plan_name, start_date, end_date,
        payer_member_id, payer_member_name, covered_member_ids,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        primaryId,
        params.memberId,
        params.locationId,
        params.amount,
        params.currency,
        params.periodType,
        params.planName,
        params.endDate, // due_date set to end_date of period
        paymentDate,
        params.status,
        params.paymentMethod || 'Cash',
        notesText || null,
        params.planId || null,
        params.planName,
        params.startDate,
        params.endDate,
        params.memberId,
        params.primaryMemberName,
        coveredIds.length > 0 ? JSON.stringify(coveredIds) : null,
        now,
      ]
    );

    // 2. Insert Linked Records for Covered Members (Family Package)
    if (params.coveredMembers && params.coveredMembers.length > 0) {
      for (const cov of params.coveredMembers) {
        const covId = `pay_cov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await runQuery(
          `INSERT INTO payments (
            id, member_id, location_id, amount, currency,
            period_type, period_label, due_date, payment_date,
            status, payment_method, notes,
            plan_id, plan_name, start_date, end_date,
            payer_member_id, payer_member_name, covered_member_ids,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            covId,
            cov.id,
            params.locationId,
            0, // Amount 0 because covered under primary family member
            params.currency,
            params.periodType,
            params.planName,
            params.endDate,
            paymentDate,
            params.status,
            params.paymentMethod || 'Family Package',
            `Covered under ${params.planName} by ${params.primaryMemberName}`,
            params.planId || null,
            params.planName,
            params.startDate,
            params.endDate,
            params.memberId,
            params.primaryMemberName,
            JSON.stringify([params.memberId]),
            now,
          ]
        );
      }
    }

    return {
      id: primaryId,
      member_id: params.memberId,
      location_id: params.locationId,
      amount: params.amount,
      currency: params.currency,
      period_type: params.periodType,
      period_label: params.planName,
      due_date: params.endDate,
      payment_date: paymentDate || undefined,
      status: params.status,
      payment_method: params.paymentMethod || 'Cash',
      notes: notesText || undefined,
      plan_id: params.planId,
      plan_name: params.planName,
      start_date: params.startDate,
      end_date: params.endDate,
      payer_member_id: params.memberId,
      payer_member_name: params.primaryMemberName,
      covered_member_ids: coveredIds.length > 0 ? JSON.stringify(coveredIds) : undefined,
      created_at: now,
    };
  },

  /**
   * Mark a payment as Paid / Unpaid / Pending.
   * If it's a family plan, also syncs any covered member records!
   */
  async updateStatus(
    paymentId: string,
    status: PaymentStatus,
    paymentMethod?: string
  ): Promise<void> {
    const paymentDate = status === 'paid' ? new Date().toISOString() : null;

    // Fetch this payment first to check if it's part of a group / family plan
    const pay = await queryFirst<any>(`SELECT * FROM payments WHERE id = ?;`, [paymentId]);

    await runQuery(
      `UPDATE payments
       SET status = ?, payment_date = ?, payment_method = COALESCE(?, payment_method)
       WHERE id = ?;`,
      [status, paymentDate, paymentMethod || null, paymentId]
    );

    if (pay) {
      // If primary payer with linked members, sync covered members
      if (pay.payer_member_id === pay.member_id && pay.start_date && pay.end_date) {
        await runQuery(
          `UPDATE payments
           SET status = ?, payment_date = ?
           WHERE payer_member_id = ? AND start_date = ? AND end_date = ? AND member_id != ?;`,
          [status, paymentDate, pay.member_id, pay.start_date, pay.end_date, pay.member_id]
        );
      } else if (pay.payer_member_id && pay.payer_member_id !== pay.member_id) {
        // If covered member, also sync primary payer
        await runQuery(
          `UPDATE payments
           SET status = ?, payment_date = ?
           WHERE id = (
             SELECT id FROM payments
             WHERE member_id = ? AND start_date = ? AND end_date = ?
             LIMIT 1
           );`,
          [status, paymentDate, pay.payer_member_id, pay.start_date, pay.end_date]
        );
      }
    }
  },

  /**
   * Delete a payment record. If it has linked covered (family) records, deletes them as well.
   */
  async deletePayment(paymentId: string): Promise<void> {
    const pay = await queryFirst<any>(`SELECT * FROM payments WHERE id = ?;`, [paymentId]);
    if (!pay) return;

    // Always delete the specific payment record by its exact ID
    await runQuery(`DELETE FROM payments WHERE id = ?;`, [paymentId]);

    // If this was a primary/payer record, also cascade-delete only the
    // family-member "covered" records linked to it (member_id != payer_member_id)
    if (pay.payer_member_id === pay.member_id && pay.start_date && pay.end_date) {
      await runQuery(
        `DELETE FROM payments
         WHERE payer_member_id = ? AND start_date = ? AND end_date = ? AND member_id != payer_member_id;`,
        [pay.member_id, pay.start_date, pay.end_date]
      );
    }
  },
};
