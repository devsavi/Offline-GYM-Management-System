import { queryAll, queryFirst, runQuery } from '../db';
import { Measurement, CustomMeasurementField } from '../../types';

export const measurementService = {
  /**
   * Automatically calculates BMI based on weight (kg) and height (cm).
   */
  calculateBMI(weightKg: number, heightCm: number): number {
    if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return 0;
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
  },

  /**
   * Get all measurements for a member ordered chronologically descending (newest first).
   */
  async getMeasurementsForMember(memberId: string): Promise<Measurement[]> {
    const rows = await queryAll<any>(
      `SELECT * FROM measurements
       WHERE member_id = ?
       ORDER BY date DESC, created_at DESC;`,
      [memberId]
    );

    return rows.map((r) => ({
      ...r,
      weight: Number(r.weight),
      height: Number(r.height),
      bmi: Number(r.bmi),
      chest: r.chest ? Number(r.chest) : undefined,
      arms: r.arms ? Number(r.arms) : undefined,
      legs: r.legs ? Number(r.legs) : undefined,
      waist: r.waist ? Number(r.waist) : undefined,
      hips: r.hips ? Number(r.hips) : undefined,
      calves: r.calves ? Number(r.calves) : undefined,
      neck: r.neck ? Number(r.neck) : undefined,
      custom_values: r.custom_values ? JSON.parse(r.custom_values) : undefined,
    }));
  },

  /**
   * Add a new measurement entry with automated BMI calculation and custom fields.
   */
  async addMeasurement(
    data: Omit<Measurement, 'id' | 'bmi' | 'created_at'>
  ): Promise<Measurement> {
    const id = `meas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const calculatedBMI = this.calculateBMI(data.weight, data.height);
    const customValuesJson = data.custom_values ? JSON.stringify(data.custom_values) : null;

    await runQuery(
      `INSERT INTO measurements (
        id, member_id, date, weight, height, bmi,
        chest, arms, legs, waist, hips, calves, neck,
        custom_values, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.member_id,
        data.date,
        data.weight,
        data.height,
        calculatedBMI,
        data.chest ?? null,
        data.arms ?? null,
        data.legs ?? null,
        data.waist ?? null,
        data.hips ?? null,
        data.calves ?? null,
        data.neck ?? null,
        customValuesJson,
        data.notes ?? null,
        now,
      ]
    );

    return {
      id,
      ...data,
      bmi: calculatedBMI,
      created_at: now,
    };
  },

  async deleteMeasurement(id: string): Promise<void> {
    await runQuery('DELETE FROM measurements WHERE id = ?;', [id]);
  },

  // --- Dynamic Custom Measurement Fields Management ---

  async getCustomFields(locationId: string): Promise<CustomMeasurementField[]> {
    const rows = await queryAll<any>(
      `SELECT * FROM custom_measurement_fields
       WHERE location_id = ? AND is_active = 1
       ORDER BY name ASC;`,
      [locationId]
    );
    return rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
    }));
  },

  async createCustomField(
    locationId: string,
    name: string,
    unit: string
  ): Promise<CustomMeasurementField> {
    const id = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await runQuery(
      `INSERT INTO custom_measurement_fields (id, location_id, name, unit, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?);`,
      [id, locationId, name.trim(), unit.trim(), now]
    );

    return {
      id,
      location_id: locationId,
      name: name.trim(),
      unit: unit.trim(),
      is_active: true,
      created_at: now,
    };
  },
};
