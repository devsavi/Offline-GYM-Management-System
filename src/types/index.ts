export type ExerciseCategory =
  | 'Chest'
  | 'Back'
  | 'Cardio'
  | 'Biceps'
  | 'Triceps'
  | 'Upper Arms'
  | 'Quadriceps'
  | 'Shoulders'
  | 'Hamstrings'
  | 'Hips'
  | 'Waist'
  | 'Calves'
  | 'Neck'
  | 'Forearms';

export interface Trainer {
  id: string;
  name: string;          // full display name (title + first + last)
  first_name?: string;
  last_name?: string;
  title?: string;
  role?: string;         // e.g. Head Coach, Gym Owner, Trainer
  age?: number;
  email?: string;
  phone?: string;
  address?: string;
  pin_hash?: string;
  biometric_enabled: boolean;
  avatar_uri?: string;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  address?: string;
  created_at: string;
  member_count?: number;
}

export interface Member {
  id: string;
  location_id: string;
  name: string;
  title?: string;
  age?: number;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  injuries?: string;
  fitness_goals?: string;
  status: 'active' | 'inactive';
  photo_uri?: string;
  created_at: string;
  updated_at: string;
  latest_payment_status?: PaymentStatus;
}

export interface CustomMeasurementField {
  id: string;
  location_id: string;
  name: string;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export interface Measurement {
  id: string;
  member_id: string;
  date: string;
  weight?: number; // in kg (optional)
  height?: number; // in cm (optional)
  bmi: number;    // auto-calculated
  chest?: number;
  arms?: number;
  legs?: number;
  waist?: number;
  hips?: number;
  calves?: number;
  neck?: number;
  custom_values?: Record<string, number | string>; // stored as JSON string in SQLite
  notes?: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  description?: string;
  is_custom: boolean;
}

export interface WorkoutPlan {
  id: string;
  member_id: string;
  title: string;
  start_date: string;
  end_date: string;
  notes?: string;
  is_active: boolean;
  calendar_event_id?: string;
  created_at: string;
  exercises?: PlanExerciseItem[];
}

export interface PlanExerciseItem {
  id: string;
  workout_plan_id: string;
  exercise_id: string;
  exercise_name: string;
  category: ExerciseCategory;
  day_of_week?: string;
  sets: number;
  reps: string;
  rest_time: number; // seconds
  target_weight?: string;
  order_index: number;
  notes?: string;
}

export interface CheckIn {
  id: string;
  member_id: string;
  location_id: string;
  check_in_time: string;
  notes?: string;
  member_name?: string;
}

export type PaymentPeriod = 'monthly' | 'yearly' | 'custom';
export type PaymentStatus = 'paid' | 'unpaid' | 'pending' | 'no_plan';
export type PaymentPlanDurationUnit = 'days' | 'weeks' | 'months' | 'years';

export interface PaymentPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  duration_value: number;
  duration_unit: PaymentPlanDurationUnit;
  member_limit: number; // 1 for individual, > 1 for family/group
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  member_id: string;
  location_id: string;
  amount: number;
  currency: string;
  period_type: PaymentPeriod;
  period_label: string; // e.g. "October 2026" or "Annual 2026-2027"
  due_date: string;
  payment_date?: string;
  status: PaymentStatus;
  payment_method?: string;
  notes?: string;
  created_at: string;
  member_name?: string;
  // Plan assignment details
  plan_id?: string;
  plan_name?: string;
  start_date?: string;
  end_date?: string;
  payer_member_id?: string;
  payer_member_name?: string;
  covered_member_ids?: string;
}

export interface MemberSummaryStats {
  totalMembers: number;
  activeMembers: number;
  checkedInToday: number;
  pendingPaymentsCount: number;
}

