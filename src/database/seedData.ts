import { Exercise } from '../types';

export const DEFAULT_EXERCISES: Omit<Exercise, 'is_custom'>[] = [
  // 1. Chest
  { id: 'ex_ch_1', name: 'Barbell Bench Press', category: 'Chest', description: 'Compound movement for pectoral mass and upper body pushing strength.', image_uri: '/exercises/chest/barbell_bench_press.webp' },
  { id: 'ex_ch_2', name: 'Kneeling Push Up', category: 'Chest', description: 'Modified push-up from the knees reducing load for beginners while targeting pectorals and triceps.', image_uri: '/exercises/chest/kneeling_push_up.webp' },
  { id: 'ex_ch_3', name: 'Shoulder Tap', category: 'Chest', description: 'Plank-based stability drill alternating shoulder taps to build core, chest, and anti-rotation strength.', image_uri: '/exercises/chest/shoulder_tap.webp' },
  { id: 'ex_ch_4', name: 'Dumbbell Svend Press', category: 'Chest', description: 'Plate or dumbbell squeeze press targeting inner pectoral adduction and chest thickness.', image_uri: '/exercises/chest/dumbbell_svend_press.webp' },
  { id: 'ex_ch_5', name: 'Pseudo Planche Push Up', category: 'Chest', description: 'Advanced push-up with hands shifted toward hips to increase anterior deltoid and lower pec loading.', image_uri: '/exercises/chest/pseudo_planche_push_up.webp' },
  { id: 'ex_ch_6', name: 'Archer Push Up', category: 'Chest', description: 'Wide-stance unilateral push-up shifting weight side to side to build single-arm strength and chest control.', image_uri: '/exercises/chest/archer_push_up.webp' },
  { id: 'ex_ch_7', name: 'Dumbbell Squeeze Press on Floor', category: 'Chest', description: 'Floor press with dumbbells squeezed together throughout the movement to maximize inner pec activation.', image_uri: '/exercises/chest/dumbbell_squeeze_press_on_floor.webp' },
  { id: 'ex_ch_8', name: 'Single Arm Push Up', category: 'Chest', description: 'Advanced unilateral push-up building significant chest, shoulder, and core strength on one side at a time.', image_uri: '/exercises/chest/single_arm_push_up.webp' },
  { id: 'ex_ch_9', name: 'Above Head Chest Stretch', category: 'Chest', description: 'Overhead doorway or wall stretch opening the pectorals and anterior shoulders to improve flexibility and posture.', image_uri: '/exercises/chest/above_head_chest_stretch.webp' },
  { id: 'ex_ch_10', name: 'Hands Release Push Up', category: 'Chest', description: 'Push-up variation where hands lift off the ground at the bottom to reset tension and improve chest engagement.', image_uri: '/exercises/chest/hands_release_push_up.webp' },
  { id: 'ex_ch_11', name: 'Arm Crossover', category: 'Chest', description: 'Standing or cable crossover movement adducting the arms across the body to isolate and stretch the pectorals.', image_uri: '/exercises/chest/arm_crossover.webp' },
  { id: 'ex_ch_12', name: 'Cable Lying Fly', category: 'Chest', description: 'Lying cable fly maintaining constant tension through the full range of pectoral adduction and stretch.', image_uri: '/exercises/chest/cable_lying_fly.webp' },
  { id: 'ex_ch_13', name: 'Cobra Push Up', category: 'Chest', description: 'Push-up variation with a forward body wave engaging lower chest, serratus anterior, and shoulder mobility.', image_uri: '/exercises/chest/cobra_push_up.webp' },
  { id: 'ex_ch_14', name: 'Doorway Chest Stretch', category: 'Chest', description: 'Static pectoral stretch using a doorframe to open the chest, anterior shoulders, and improve thoracic posture.', image_uri: '/exercises/chest/doorway_chest_stretch.webp' },
  { id: 'ex_ch_15', name: 'Dynamic Chest Stretch', category: 'Chest', description: 'Arm swing mobility drill warming up the pectorals and shoulder girdle through full horizontal abduction range.', image_uri: '/exercises/chest/dynamic_chest_stretch.webp' },
  { id: 'ex_ch_16', name: 'Kneeling Rotational Push Up', category: 'Chest', description: 'Kneeling push-up with a rotational reach at the top, engaging the chest, obliques, and shoulder stabilizers.', image_uri: '/exercises/chest/kneeling_rotational_push_up.webp' },
  { id: 'ex_ch_17', name: 'Smith Decline Bench Press', category: 'Chest', description: 'Decline press on a Smith machine targeting the lower pectoral region with a guided bar path for safety.', image_uri: '/exercises/chest/smith_decline_bench_press.webp' },
  { id: 'ex_ch_18', name: 'Standing Fly', category: 'Chest', description: 'Standing cable or band fly isolating pectoral adduction with an upright torso and continuous resistance.', image_uri: '/exercises/chest/standing_fly.webp' },
  { id: 'ex_ch_19', name: 'Corner Wall Chest Stretch', category: 'Chest', description: 'Corner wall stretch opening the chest and anterior shoulders by pressing both arms into adjacent walls.', image_uri: '/exercises/chest/coner_wall_chest_stretch.webp' },
  { id: 'ex_ch_20', name: 'Barbell Incline Close Grip Bench Press', category: 'Chest', description: 'Incline bench press with a narrow grip targeting the upper chest and triceps simultaneously.', image_uri: '/exercises/chest/barbell_incline_close_grip_bench_press.webp' },
  { id: 'ex_ch_21', name: 'Decline Pullover', category: 'Chest', description: 'Dumbbell or barbell pullover on a decline bench stretching the pectorals and engaging the lats through a long arc.', image_uri: '/exercises/chest/decline_pullover.webp' },
  { id: 'ex_ch_22', name: 'Power Push Away', category: 'Chest', description: 'Explosive push-away movement from a wall or surface building reactive chest power and fast-twitch fiber recruitment.', image_uri: '/exercises/chest/power_push_away.webp' },
  { id: 'ex_ch_23', name: 'Chest Bench Dip', category: 'Chest', description: 'Bench dip with elbows flared to emphasize lower pectoral and tricep activation through a deep dip range.', image_uri: '/exercises/chest/chest_bench_dip.webp' },
  { id: 'ex_ch_24', name: 'Bent Arm Chest Stretch', category: 'Chest', description: 'Static pectoral stretch with a 90-degree elbow bend against a wall or doorframe targeting mid-chest flexibility.', image_uri: '/exercises/chest/bent_arm_chest_stretch.webp' },
  { id: 'ex_ch_25', name: 'Cable Decline Fly', category: 'Chest', description: 'Cable fly with a downward arc path targeting the lower pectoral fibers with constant cable tension.', image_uri: '/exercises/chest/cable_decline_fly.webp' },

  // 2. Back
  { id: 'ex_bk_1', name: 'Barbell Deadlift', category: 'Back', description: 'Full posterior chain strength builder from floor to lockout.' },
  { id: 'ex_bk_2', name: 'Pull-Ups / Chin-Ups', category: 'Back', description: 'Vertical pulling bodyweight exercise for latissimus dorsi.' },
  { id: 'ex_bk_3', name: 'Bent-Over Barbell Row', category: 'Back', description: 'Horizontal row building mid-back thickness and lats.' },
  { id: 'ex_bk_4', name: 'Seated Cable Row', category: 'Back', description: 'Controlled horizontal pull focusing on rhomboids and middle trapezius.' },
  { id: 'ex_bk_5', name: 'Lat Pulldown', category: 'Back', description: 'Vertical cable pull targeting lat width with varied grip attachments.' },

  // 3. Cardio
  { id: 'ex_cd_1', name: 'Double Jump Rope', category: 'Cardio', description: 'Advanced jump rope technique with two rope rotations per jump, demanding high speed and coordination.', image_uri: '/exercises/cardio/double_jump_rope.webp' },
  { id: 'ex_cd_2', name: 'Jump Rope', category: 'Cardio', description: 'Classic cardiovascular exercise improving footwork, rhythm, and aerobic endurance.', image_uri: '/exercises/cardio/jump_rope.webp' },
  { id: 'ex_cd_3', name: 'Skip Jump Rope', category: 'Cardio', description: 'Single-leg alternating skip pattern on the jump rope for coordination and calf endurance.', image_uri: '/exercises/cardio/skip_jump_rope.webp' },
  { id: 'ex_cd_4', name: 'Mountain Climber', category: 'Cardio', description: 'High-intensity bodyweight movement driving knees to chest, targeting core and cardiovascular conditioning.', image_uri: '/exercises/cardio/mountain_climber.webp' },
  { id: 'ex_cd_5', name: 'Walking', category: 'Cardio', description: 'Low-impact steady-state aerobic activity suitable for warm-up, active recovery, or fat-burning sessions.', image_uri: '/exercises/cardio/walking.webp' },
  { id: 'ex_cd_6', name: 'Walking On Treadmill', category: 'Cardio', description: 'Controlled incline and pace walking on a treadmill for consistent low-impact cardio.', image_uri: '/exercises/cardio/walking_on_treadmill.webp' },
  { id: 'ex_cd_7', name: 'Stationary Bike Run', category: 'Cardio', description: 'Low-impact cycling on a stationary bike building leg endurance and cardiovascular capacity.', image_uri: '/exercises/cardio/stationary_bike_run.webp' },
  { id: 'ex_cd_8', name: 'Jump Box', category: 'Cardio', description: 'Explosive plyometric box jump developing lower body power, fast-twitch muscle activation, and cardiovascular output.', image_uri: '/exercises/cardio/jump_box.webp' },
  { id: 'ex_cd_9', name: 'Stationary Bike Walk', category: 'Cardio', description: 'Easy-paced stationary bike session for warm-up, active recovery, or low-intensity fat burning.', image_uri: '/exercises/cardio/stationary_bike_walk.webp' },
  { id: 'ex_cd_10', name: 'Jumping Jack', category: 'Cardio', description: 'Full-body calisthenic movement combining arm raises and lateral jumps for aerobic warm-up and conditioning.', image_uri: '/exercises/cardio/jumping_jack.webp' },
  { id: 'ex_cd_11', name: 'Riding Bicycle', category: 'Cardio', description: 'Outdoor or indoor cycling for sustained aerobic endurance, leg drive, and cardiovascular health.', image_uri: '/exercises/cardio/riding_bicycle.webp' },
  { id: 'ex_cd_12', name: 'Sprint', category: 'Cardio', description: 'Maximum-effort short-distance run for explosive speed, anaerobic power, and metabolic conditioning.', image_uri: '/exercises/cardio/sprint.webp' },
  { id: 'ex_cd_13', name: 'Quick Feet Run', category: 'Cardio', description: 'Rapid short-stride running drill improving foot speed, agility, and neuromuscular coordination.', image_uri: '/exercises/cardio/quick_feet_run.webp' },
  { id: 'ex_cd_14', name: 'High Knee Squat', category: 'Cardio', description: 'Dynamic combination of high knees and squat movements targeting hip flexors, quads, and cardiovascular output.', image_uri: '/exercises/cardio/high_knee_squat.webp' },
  { id: 'ex_cd_15', name: 'Butt Kicks', category: 'Cardio', description: 'Running drill kicking heels toward glutes to activate hamstrings and improve stride mechanics.', image_uri: '/exercises/cardio/butt_kicks.webp' },
  { id: 'ex_cd_16', name: 'High Knee Skip', category: 'Cardio', description: 'Skipping pattern with exaggerated knee drive for hip flexor activation, coordination, and aerobic warm-up.', image_uri: '/exercises/cardio/high_knee_skip.webp' },
  { id: 'ex_cd_17', name: 'Place Jog', category: 'Cardio', description: 'Low-impact jogging in place for cardiovascular warm-up, active recovery, or steady-state aerobic conditioning.', image_uri: '/exercises/cardio/place_jog.webp.webp' },
  { id: 'ex_cd_18', name: 'Run', category: 'Cardio', description: 'Steady-pace outdoor or treadmill running for aerobic base building, endurance, and cardiovascular health.', image_uri: '/exercises/cardio/run.webp' },
  { id: 'ex_cd_19', name: 'Frog Hops', category: 'Cardio', description: 'Explosive squat-to-jump movement mimicking a frog leap for lower body power, hip drive, and cardio conditioning.', image_uri: '/exercises/cardio/frog_hops.webp' },
  { id: 'ex_cd_20', name: 'Battling Ropes', category: 'Cardio', description: 'High-intensity wave patterns with heavy ropes building upper body endurance, grip strength, and cardiovascular output.', image_uri: '/exercises/cardio/battling_ropes.webp' },

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

export const DEFAULT_PAYMENT_PLANS = [
  {
    id: 'plan_monthly',
    name: 'Monthly Plan',
    amount: 2500,
    currency: 'LKR',
    duration_value: 1,
    duration_unit: 'months' as const,
    member_limit: 1,
    description: 'Standard monthly gym membership with full equipment access.',
  },
  {
    id: 'plan_3months',
    name: 'Three Month Plan',
    amount: 4500,
    currency: 'LKR',
    duration_value: 3,
    duration_unit: 'months' as const,
    member_limit: 1,
    description: 'Quarterly membership package with discounted rate.',
  },
  {
    id: 'plan_family_2',
    name: 'Family Plan (2 Members)',
    amount: 4000,
    currency: 'LKR',
    duration_value: 1,
    duration_unit: 'months' as const,
    member_limit: 2,
    description: 'Covers 2 family members under a single package for 1 month.',
  },
  {
    id: 'plan_family_5',
    name: 'Family Plan (5 Members)',
    amount: 10000,
    currency: 'LKR',
    duration_value: 1,
    duration_unit: 'months' as const,
    member_limit: 5,
    description: 'Covers up to 5 family members under a single package for 1 month.',
  },
  {
    id: 'plan_1year',
    name: 'One Year Plan',
    amount: 20000,
    currency: 'LKR',
    duration_value: 1,
    duration_unit: 'years' as const,
    member_limit: 1,
    description: 'Full 1-year annual membership with maximum savings.',
  },
];

