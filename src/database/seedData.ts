import { Exercise } from '../types';

export const DEFAULT_EXERCISES: Omit<Exercise, 'is_custom'>[] = [
  // 1. Chest
  { id: 'ex_ch_1', name: 'Barbell Bench Press', category: 'Chest', description: 'Compound movement for pectoral mass and upper body pushing strength.' },
  { id: 'ex_ch_2', name: 'Incline Dumbbell Press', category: 'Chest', description: 'Upper chest development with independent dumbbell stabilization.' },
  { id: 'ex_ch_3', name: 'Cable Chest Flyes', category: 'Chest', description: 'Isolation exercise with continuous resistance across full adduction.' },
  { id: 'ex_ch_4', name: 'Chest Dips', category: 'Chest', description: 'Bodyweight or weighted dips with slight torso lean to emphasize lower pec.' },
  { id: 'ex_ch_5', name: 'Standard Push-Ups', category: 'Chest', description: 'Fundamental push movement engaging pectorals, core, and triceps.' },

  // 2. Back
  { id: 'ex_bk_1', name: 'Barbell Deadlift', category: 'Back', description: 'Full posterior chain strength builder from floor to lockout.' },
  { id: 'ex_bk_2', name: 'Pull-Ups / Chin-Ups', category: 'Back', description: 'Vertical pulling bodyweight exercise for latissimus dorsi.' },
  { id: 'ex_bk_3', name: 'Bent-Over Barbell Row', category: 'Back', description: 'Horizontal row building mid-back thickness and lats.' },
  { id: 'ex_bk_4', name: 'Seated Cable Row', category: 'Back', description: 'Controlled horizontal pull focusing on rhomboids and middle trapezius.' },
  { id: 'ex_bk_5', name: 'Lat Pulldown', category: 'Back', description: 'Vertical cable pull targeting lat width with varied grip attachments.' },

  // 3. Cardio
  { id: 'ex_cd_1', name: 'Treadmill Interval Sprint', category: 'Cardio', description: 'High-intensity interval running for cardiovascular conditioning and fat loss.' },
  { id: 'ex_cd_2', name: 'Rowing Machine (Ergometer)', category: 'Cardio', description: 'Full-body low-impact aerobic and anaerobic endurance.' },
  { id: 'ex_cd_3', name: 'Assault / Air Bike', category: 'Cardio', description: 'High-metabolic calorie burn utilizing arms and legs simultaneously.' },
  { id: 'ex_cd_4', name: 'Jump Rope High-Knees', category: 'Cardio', description: 'Footwork agility, calf endurance, and aerobic conditioning.' },

  // 4. Biceps
  { id: 'ex_bc_1', name: 'Barbell Bicep Curl', category: 'Biceps', description: 'Classic standing strict barbell curl for bicep mass.' },
  { id: 'ex_bc_2', name: 'Hammer Curl', category: 'Biceps', description: 'Neutral grip curl targeting brachialis and brachioradialis.' },
  { id: 'ex_bc_3', name: 'Incline Dumbbell Curl', category: 'Biceps', description: 'Deep stretch on the long head of the bicep from an incline bench.' },
  { id: 'ex_bc_4', name: 'Preacher Curl', category: 'Biceps', description: 'Strict isolated curl removing shoulder momentum.' },

  // 5. Triceps
  { id: 'ex_tc_1', name: 'Triceps Rope Pushdown', category: 'Triceps', description: 'Cable extension targeting lateral and medial triceps heads.' },
  { id: 'ex_tc_2', name: 'Skull Crushers (Lying Extension)', category: 'Triceps', description: 'EZ-bar extension targeting the long head of the triceps.' },
  { id: 'ex_tc_3', name: 'Close-Grip Bench Press', category: 'Triceps', description: 'Compound heavy pushing movement overload for triceps.' },
  { id: 'ex_tc_4', name: 'Overhead Dumbbell Extension', category: 'Triceps', description: 'Deep stretch overhead extension targeting long head.' },

  // 6. Quadriceps
  { id: 'ex_qd_1', name: 'Barbell Back Squat', category: 'Quadriceps', description: 'The king of lower body movements for quad strength and leg drive.' },
  { id: 'ex_qd_2', name: 'Leg Press 45-Degree', category: 'Quadriceps', description: 'Heavy controlled leg drive with lumbar back support.' },
  { id: 'ex_qd_3', name: 'Bulgarian Split Squat', category: 'Quadriceps', description: 'Unilateral leg builder addressing strength imbalances.' },
  { id: 'ex_qd_4', name: 'Leg Extensions', category: 'Quadriceps', description: 'Open-chain isolation machine for terminal knee extension and quad pump.' },

  // 7. Shoulders
  { id: 'ex_sh_1', name: 'Overhead Barbell Press (OHP)', category: 'Shoulders', description: 'Standing strict vertical push for anterior deltoids and clavicular strength.' },
  { id: 'ex_sh_2', name: 'Dumbbell Lateral Raise', category: 'Shoulders', description: 'Side deltoid isolation creating width and capped shoulders.' },
  { id: 'ex_sh_3', name: 'Face Pulls', category: 'Shoulders', description: 'Cable pull to eye level for rear deltoids and rotator cuff health.' },
  { id: 'ex_sh_4', name: 'Arnold Dumbbell Press', category: 'Shoulders', description: 'Rotational press engaging anterior and lateral heads smoothly.' },

  // 8. Hamstrings
  { id: 'ex_hm_1', name: 'Romanian Deadlift (RDL)', category: 'Hamstrings', description: 'Hip hinge movement emphasizing hamstring stretch and glute tie-in.' },
  { id: 'ex_hm_2', name: 'Lying Leg Curl', category: 'Hamstrings', description: 'Knee flexion isolation directly recruiting biceps femoris.' },
  { id: 'ex_hm_3', name: 'Seated Leg Curl', category: 'Hamstrings', description: 'High hamstring activation through seated hip-flexed knee flexion.' },
  { id: 'ex_hm_4', name: 'Kettlebell Swings', category: 'Hamstrings', description: 'Dynamic ballistic hip-hinge power and posterior chain stamina.' },

  // 9. Hips
  { id: 'ex_hp_1', name: 'Barbell Hip Thrust', category: 'Hips', description: 'Peak glute contraction and horizontal hip extension overload.' },
  { id: 'ex_hp_2', name: 'Cable Hip Abduction', category: 'Hips', description: 'Isolation for gluteus medius and outer hip stabilizers.' },
  { id: 'ex_hp_3', name: 'Glute Kickbacks', category: 'Hips', description: 'Targeted single-leg extension isolating the gluteus maximus.' },
  { id: 'ex_hp_4', name: 'Banded Clamshells', category: 'Hips', description: 'Hip external rotation for joint stabilization and injury prevention.' },

  // 10. Waist
  { id: 'ex_ws_1', name: 'Hanging Leg Raises', category: 'Waist', description: 'Core and hip flexor movement targeting rectus abdominis.' },
  { id: 'ex_ws_2', name: 'Plank Hold', category: 'Waist', description: 'Isometric anti-extension core stability and transverse abdominis.' },
  { id: 'ex_ws_3', name: 'Cable Woodchoppers', category: 'Waist', description: 'Rotational power and transverse abdominal / obliques training.' },
  { id: 'ex_ws_4', name: 'Ab Wheel Rollouts', category: 'Waist', description: 'Advanced eccentric core extension and abdominal tension.' },

  // 11. Calves
  { id: 'ex_cf_1', name: 'Standing Calf Raise', category: 'Calves', description: 'Straight-leg calf extension targeting gastrocnemius muscle.' },
  { id: 'ex_cf_2', name: 'Seated Calf Raise', category: 'Calves', description: 'Bent-knee calf flexion focusing primarily on soleus muscle.' },
  { id: 'ex_cf_3', name: 'Donkey Calf Raise', category: 'Calves', description: 'Stretched calf raise position with hip flexion for peak stretch.' },
  { id: 'ex_cf_4', name: 'Single-Leg Dumbbell Calf Raise', category: 'Calves', description: 'Unilateral focus to eliminate dominant leg compensation.' },

  // 12. Neck
  { id: 'ex_nk_1', name: 'Neck Flexion (Plate/Band)', category: 'Neck', description: 'Strengthening sternocleidomastoid and anterior cervical musculature.' },
  { id: 'ex_nk_2', name: 'Neck Extension Resistance', category: 'Neck', description: 'Posterior cervical spine strengthening for posture and impact resistance.' },
  { id: 'ex_nk_3', name: 'Lateral Neck Isometric Hold', category: 'Neck', description: 'Side neck stability against hand or harness resistance.' },
  { id: 'ex_nk_4', name: 'Barbell Shrugs', category: 'Neck', description: 'Upper trapezius builder linking neck and shoulder girdle.' },

  // 13. Forearms
  { id: 'ex_fa_1', name: 'Barbell Wrist Curls', category: 'Forearms', description: 'Forearm flexor isolation on bench for grip strength and wrist stability.' },
  { id: 'ex_fa_2', name: 'Reverse Barbell Curls', category: 'Forearms', description: 'Overhand curl targeting brachioradialis and forearm extensors.' },
  { id: 'ex_fa_3', name: "Farmer's Walk Carry", category: 'Forearms', description: 'Heavy grip endurance and isometric forearm tension walking with heavy weights.' },
  { id: 'ex_fa_4', name: 'Wrist Roller Extensions', category: 'Forearms', description: 'Continuous dynamic winding movement building forearm burn and tendon strength.' },
];
