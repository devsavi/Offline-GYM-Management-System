import { queryAll, queryFirst, runQuery, withTransaction } from '../db';
import { WorkoutPlan, PlanExerciseItem, Exercise, ExerciseCategory } from '../../types';

export const workoutService = {
  /**
   * Fetch all dictionary exercises, optionally filtered by category.
   */
  async getExercises(category?: ExerciseCategory): Promise<Exercise[]> {
    let sql = 'SELECT * FROM exercises';
    const params: string[] = [];

    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }
    sql += ' ORDER BY category ASC, name ASC;';

    const rows = await queryAll<any>(sql, params);
    return rows.map((r) => ({
      ...r,
      is_custom: Boolean(r.is_custom),
      image_uri:
        r.image_uri ||
        (r.id === 'ex_ch_1' ||
        (r.name?.toLowerCase().includes('bench press') && r.category?.toLowerCase() === 'chest')
          ? '/exercises/chest/barbell_bench_press.webp'
          : undefined),
    }));
  },

  async addCustomExercise(
    name: string,
    category: ExerciseCategory,
    description?: string,
    image_uri?: string
  ): Promise<Exercise> {
    const id = `ex_c_${Date.now()}`;
    await runQuery(
      `INSERT INTO exercises (id, name, category, description, is_custom, image_uri)
       VALUES (?, ?, ?, ?, 1, ?);`,
      [id, name.trim(), category, description?.trim() || null, image_uri?.trim() || null]
    );
    return {
      id,
      name: name.trim(),
      category,
      description,
      is_custom: true,
      image_uri: image_uri?.trim() || undefined,
    };
  },

  /**
   * Retrieves active plan for a member, checking if end_date has expired.
   */
  async getActivePlan(memberId: string): Promise<WorkoutPlan | null> {
    const today = new Date().toISOString().split('T')[0];

    // Automatically expire any active plans whose end_date is in the past
    await runQuery(
      `UPDATE workout_plans
       SET is_active = 0
       WHERE member_id = ? AND is_active = 1 AND end_date < ?;`,
      [memberId, today]
    );

    const planRow = await queryFirst<any>(
      `SELECT * FROM workout_plans
       WHERE member_id = ? AND is_active = 1
       ORDER BY created_at DESC, start_date DESC LIMIT 1;`,
      [memberId]
    );

    if (!planRow) return null;

    const exercises = await this.getPlanExercises(planRow.id);
    return {
      ...planRow,
      is_active: Boolean(planRow.is_active),
      exercises,
    };
  },

  /**
   * Retrieves historical (expired/past) workout plans for a member.
   */
  async getHistoricalPlans(memberId: string): Promise<WorkoutPlan[]> {
    const rows = await queryAll<any>(
      `SELECT * FROM workout_plans
       WHERE member_id = ? AND is_active = 0
       ORDER BY end_date DESC;`,
      [memberId]
    );

    const plans: WorkoutPlan[] = [];
    for (const r of rows) {
      const exercises = await this.getPlanExercises(r.id);
      plans.push({
        ...r,
        is_active: false,
        exercises,
      });
    }
    return plans;
  },

  /**
   * Get exercises assigned to a specific workout plan with category & names joined.
   */
  async getPlanExercises(planId: string): Promise<PlanExerciseItem[]> {
    const rows = await queryAll<any>(
      `SELECT
        pe.id, pe.workout_plan_id, pe.exercise_id, pe.day_of_week,
        pe.sets, pe.reps, pe.rest_time, pe.target_weight, pe.order_index, pe.notes,
        e.name as exercise_name, e.category, e.image_uri
       FROM plan_exercises pe
       JOIN exercises e ON pe.exercise_id = e.id
       WHERE pe.workout_plan_id = ?
       ORDER BY pe.order_index ASC;`,
      [planId]
    );

    return rows.map((r) => ({
      ...r,
      sets: Number(r.sets),
      rest_time: Number(r.rest_time),
      order_index: Number(r.order_index),
      image_uri:
        r.image_uri ||
        (r.exercise_id === 'ex_ch_1' ||
        (r.exercise_name?.toLowerCase().includes('bench press') && r.category?.toLowerCase() === 'chest')
          ? '/exercises/chest/barbell_bench_press.webp'
          : undefined),
    }));
  },

  /**
   * Create a new workout plan. Automatically deactivates prior active plans.
   */
  async createWorkoutPlan(
    plan: {
      member_id: string;
      title: string;
      start_date: string;
      end_date: string;
      notes?: string;
      calendar_event_id?: string;
    },
    exercises: Omit<PlanExerciseItem, 'id' | 'workout_plan_id' | 'exercise_name' | 'category'>[]
  ): Promise<WorkoutPlan> {
    return await withTransaction(async (db) => {
      // 1. Deactivate older active plans for this member
      await db.runAsync(
        `UPDATE workout_plans
         SET is_active = 0
         WHERE member_id = ? AND is_active = 1;`,
        [plan.member_id]
      );

      // 2. Insert new workout plan
      const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO workout_plans (
          id, member_id, title, start_date, end_date, notes, is_active, calendar_event_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [
          planId,
          plan.member_id,
          plan.title.trim(),
          plan.start_date,
          plan.end_date,
          plan.notes?.trim() || null,
          plan.calendar_event_id || null,
          now,
        ]
      );

      // 3. Insert plan exercises
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        const itemPk = `pe_${Date.now()}_${i}`;
        await db.runAsync(
          `INSERT INTO plan_exercises (
            id, workout_plan_id, exercise_id, day_of_week, sets, reps, rest_time, target_weight, order_index, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            itemPk,
            planId,
            ex.exercise_id,
            ex.day_of_week || 'General',
            ex.sets || 3,
            ex.reps || '10-12',
            ex.rest_time || 60,
            ex.target_weight || null,
            i,
            ex.notes?.trim() || null,
          ]
        );
      }

      return {
        id: planId,
        member_id: plan.member_id,
        title: plan.title.trim(),
        start_date: plan.start_date,
        end_date: plan.end_date,
        notes: plan.notes,
        is_active: true,
        calendar_event_id: plan.calendar_event_id,
        created_at: now,
      };
    });
  },

  async deleteWorkoutPlan(planId: string): Promise<void> {
    await runQuery('DELETE FROM workout_plans WHERE id = ?;', [planId]);
  },

  /**
   * Permanently delete an exercise from the dictionary.
   * Also removes any plan_exercises rows that reference it.
   */
  async deleteExercise(exerciseId: string): Promise<void> {
    await runQuery('DELETE FROM plan_exercises WHERE exercise_id = ?;', [exerciseId]);
    await runQuery('DELETE FROM exercises WHERE id = ?;', [exerciseId]);
  },
};
