import { queryAll, queryFirst, runQuery } from '../db';
import { PaymentPlan } from '../../types';

export const planService = {
  /**
   * Fetch all active payment plans.
   */
  async getAllPlans(): Promise<PaymentPlan[]> {
    const rows = await queryAll<any>(
      `SELECT * FROM payment_plans
       WHERE is_active = 1
       ORDER BY amount ASC;`
    );
    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
      duration_value: Number(r.duration_value),
      member_limit: Number(r.member_limit || 1),
      is_active: Boolean(r.is_active),
    }));
  },

  /**
   * Fetch a single plan by its ID.
   */
  async getPlanById(id: string): Promise<PaymentPlan | null> {
    const r = await queryFirst<any>(
      `SELECT * FROM payment_plans WHERE id = ?;`,
      [id]
    );
    if (!r) return null;
    return {
      ...r,
      amount: Number(r.amount),
      duration_value: Number(r.duration_value),
      member_limit: Number(r.member_limit || 1),
      is_active: Boolean(r.is_active),
    };
  },

  /**
   * Create a new custom payment plan.
   */
  async createPlan(
    data: Omit<PaymentPlan, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PaymentPlan> {
    const id = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO payment_plans (
        id, name, amount, currency, duration_value, duration_unit,
        member_limit, description, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.name.trim(),
        data.amount,
        (data.currency || 'LKR').trim().toUpperCase(),
        data.duration_value || 1,
        data.duration_unit || 'months',
        data.member_limit || 1,
        data.description?.trim() || null,
        data.is_active !== false ? 1 : 0,
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

  /**
   * Update an existing plan.
   */
  async updatePlan(id: string, data: Partial<PaymentPlan>): Promise<void> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.amount !== undefined) {
      fields.push('amount = ?');
      params.push(data.amount);
    }
    if (data.currency !== undefined) {
      fields.push('currency = ?');
      params.push(data.currency.trim().toUpperCase());
    }
    if (data.duration_value !== undefined) {
      fields.push('duration_value = ?');
      params.push(data.duration_value);
    }
    if (data.duration_unit !== undefined) {
      fields.push('duration_unit = ?');
      params.push(data.duration_unit);
    }
    if (data.member_limit !== undefined) {
      fields.push('member_limit = ?');
      params.push(data.member_limit);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description?.trim() || null);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }

    fields.push('updated_at = ?');
    params.push(now);

    params.push(id);
    await runQuery(
      `UPDATE payment_plans SET ${fields.join(', ')} WHERE id = ?;`,
      params
    );
  },

  /**
   * Delete a plan (hard delete or soft delete).
   */
  async deletePlan(id: string): Promise<void> {
    await runQuery(`DELETE FROM payment_plans WHERE id = ?;`, [id]);
  },
};
