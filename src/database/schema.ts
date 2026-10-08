export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS trainers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  role TEXT,
  age INTEGER,
  email TEXT,
  phone TEXT,
  address TEXT,
  pin_hash TEXT,
  biometric_enabled INTEGER DEFAULT 0,
  avatar_uri TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  title TEXT,
  name TEXT NOT NULL,
  age INTEGER,
  dob TEXT,
  gender TEXT DEFAULT 'male',
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  injuries TEXT,
  fitness_goals TEXT,
  status TEXT DEFAULT 'active',
  photo_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_measurement_fields (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  date TEXT NOT NULL,
  weight REAL NOT NULL,
  height REAL NOT NULL,
  bmi REAL NOT NULL,
  chest REAL,
  arms REAL,
  legs REAL,
  waist REAL,
  hips REAL,
  calves REAL,
  neck REAL,
  custom_values TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_custom INTEGER DEFAULT 0,
  image_uri TEXT
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  calendar_event_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plan_exercises (
  id TEXT PRIMARY KEY,
  workout_plan_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  day_of_week TEXT,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '10-12',
  rest_time INTEGER NOT NULL DEFAULT 60,
  target_weight TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  check_in_time TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'LKR',
  duration_value INTEGER NOT NULL DEFAULT 1,
  duration_unit TEXT NOT NULL DEFAULT 'months',
  member_limit INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'LKR',
  period_type TEXT NOT NULL,
  period_label TEXT NOT NULL,
  due_date TEXT NOT NULL,
  payment_date TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  notes TEXT,
  plan_id TEXT,
  plan_name TEXT,
  start_date TEXT,
  end_date TEXT,
  payer_member_id TEXT,
  payer_member_name TEXT,
  covered_member_ids TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_members_location ON members(location_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(location_id, status);
CREATE INDEX IF NOT EXISTS idx_measurements_member ON measurements(member_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_plans_member ON workout_plans(member_id, is_active);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan ON plan_exercises(workout_plan_id, order_index);
CREATE INDEX IF NOT EXISTS idx_check_ins_location ON check_ins(location_id, check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_location ON payments(location_id, status);
`;

