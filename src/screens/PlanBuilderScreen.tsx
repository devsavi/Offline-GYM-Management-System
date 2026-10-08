import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  StatusBar,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, rounded, shadows } from '../theme/colors';
import { workoutService } from '../database/services/workoutService';
import { memberService } from '../database/services/memberService';
import { addWorkoutPlanToCalendar } from '../utils/calendar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Exercise, ExerciseCategory, Member, PlanExerciseItem } from '../types';
import { CategoryIcon } from '../components/CategoryIcon';

const TOP_BAR_BG = require('../../public/top_bar.webp');
const PLACEHOLDER_COLOR = '#8B9E93';

const DURATION_OPTIONS = ['1 Month', '2 Months', '3 Months', '6 Months', '12 Months', 'Custom'] as const;
type DurationOption = (typeof DURATION_OPTIONS)[number];

type Props = NativeStackScreenProps<RootStackParamList, 'PlanBuilder'>;

const CATEGORIES: ExerciseCategory[] = [
  'Cardio',
  'Chest',
  'Biceps',
  'Triceps',
  'Upper Arms',
  'Forearms',
  'Shoulders',
  'Neck',
  'Back',
  'Waist',
  'Hips',
  'Quadriceps',
  'Hamstrings',
  'Calves',
];

export const PlanBuilderScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { memberId } = route.params;

  const [member, setMember] = useState<Member | null>(null);

  // Form Fields - No auto-filled title or notes as requested
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Duration Selector
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>('1 Month');

  const calculateEndDate = (start: string, months: number): string => {
    try {
      const parts = start.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setMonth(d.getMonth() + months);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch {}
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  const [endDate, setEndDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const parts = today.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setMonth(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [notes, setNotes] = useState('');

  // Selected exercises for this plan
  const [selectedExercises, setSelectedExercises] = useState<
    Omit<PlanExerciseItem, 'id' | 'workout_plan_id'>[]
  >([]);

  // Exercise Picker Modal State
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory>('Chest');

  useEffect(() => {
    loadMemberAndExercises();
  }, [memberId]);

  const loadMemberAndExercises = async () => {
    const m = await memberService.getMemberById(memberId);
    setMember(m);
    const exercises = await workoutService.getExercises();
    setAllExercises(exercises);
  };

  const handleSelectDuration = (duration: DurationOption) => {
    setSelectedDuration(duration);
    if (duration === '1 Month') setEndDate(calculateEndDate(startDate, 1));
    else if (duration === '2 Months') setEndDate(calculateEndDate(startDate, 2));
    else if (duration === '3 Months') setEndDate(calculateEndDate(startDate, 3));
    else if (duration === '6 Months') setEndDate(calculateEndDate(startDate, 6));
    else if (duration === '12 Months') setEndDate(calculateEndDate(startDate, 12));
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (selectedDuration === '1 Month') setEndDate(calculateEndDate(newStart, 1));
    else if (selectedDuration === '2 Months') setEndDate(calculateEndDate(newStart, 2));
    else if (selectedDuration === '3 Months') setEndDate(calculateEndDate(newStart, 3));
    else if (selectedDuration === '6 Months') setEndDate(calculateEndDate(newStart, 6));
    else if (selectedDuration === '12 Months') setEndDate(calculateEndDate(newStart, 12));
  };

  const handleSelectExercise = (exercise: Exercise) => {
    const newItem: Omit<PlanExerciseItem, 'id' | 'workout_plan_id'> = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category,
      sets: 3,
      reps: '10-12',
      rest_time: 60,
      target_weight: 'Moderate',
      order_index: selectedExercises.length,
      day_of_week: 'Day 1',
    };

    setSelectedExercises([...selectedExercises, newItem]);
    setShowExerciseModal(false);
  };

  const handleRemoveExercise = (index: number) => {
    const updated = selectedExercises.filter((_, i) => i !== index);
    setSelectedExercises(updated);
  };

  const handleUpdateExerciseParam = (
    index: number,
    field: keyof Omit<PlanExerciseItem, 'id' | 'workout_plan_id'>,
    value: any
  ) => {
    const updated = [...selectedExercises];
    (updated[index] as any)[field] = value;
    setSelectedExercises(updated);
  };

  const handleSavePlan = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a plan title.');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Required', 'Please add at least one exercise to this workout routine.');
      return;
    }

    try {
      const plan = await workoutService.createWorkoutPlan(
        {
          member_id: memberId,
          title: title.trim(),
          start_date: startDate,
          end_date: endDate,
          notes: notes.trim() || undefined,
        },
        selectedExercises
      );

      // Calendar sync option
      if (member) {
        Alert.alert(
          'Plan Saved Successfully',
          'The workout plan has been activated for this member. Would you like to sync this schedule with device calendar?',
          [
            {
              text: 'No, Done',
              style: 'cancel',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'Sync to Calendar',
              onPress: async () => {
                await addWorkoutPlanToCalendar(member.name, plan);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Save Error', e.message || 'Failed to save workout plan');
    }
  };

  const filteredExercises = allExercises.filter((e) => e.category === activeCategory);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── TOP HERO WITH CURVED ARC (Fixed header, exact same as Profile Screen) ── */}
      <View style={styles.fixedHeaderWrap}>
        <View style={[styles.heroFoliageContainer, { minHeight: 180 + insets.top }]}>
          <ImageBackground
            source={TOP_BAR_BG}
            style={[styles.foliageBg, { minHeight: 180 + insets.top }]}
            imageStyle={styles.foliageImage}
            resizeMode="cover"
          >
            <View style={[styles.foliageOverlay, { paddingTop: insets.top + 16, minHeight: 180 + insets.top }]}>
              <Text style={styles.foliageBrandTitle}>GripState</Text>
              <View style={styles.foliageDivider} />
              <Text style={styles.foliageBrandSubtitle} numberOfLines={1}>
                {member ? `Plan for ${member.name}` : 'The professional gym management platform.'}
              </Text>
            </View>
          </ImageBackground>

          {/* Top Left Back Button */}
          <TouchableOpacity
            style={[styles.topLeftBackBtn, { top: insets.top + 12 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.whiteBody}>
          <Text style={styles.sectionHeading}>Plan Configuration</Text>

          {/* Plan Title */}
          <Text style={styles.inputLabel}>Plan Title *</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 4-Week Hypertrophy Routine"
              placeholderTextColor={PLACEHOLDER_COLOR}
              autoCapitalize="words"
            />
          </View>

          {/* Duration Selector Chips */}
          <Text style={styles.inputLabel}>Plan Duration</Text>
          <View style={styles.durationChipRow}>
            {DURATION_OPTIONS.map((dur) => (
              <TouchableOpacity
                key={dur}
                style={[
                  styles.durationChip,
                  selectedDuration === dur && styles.durationChipActive,
                ]}
                onPress={() => handleSelectDuration(dur)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    selectedDuration === dur && styles.durationChipTextActive,
                  ]}
                >
                  {dur}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start & End Dates */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  value={startDate}
                  onChangeText={handleStartDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                />
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.inputLabel}>End Date</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  value={endDate}
                  onChangeText={(val) => {
                    setEndDate(val);
                    setSelectedDuration('Custom');
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                />
              </View>
            </View>
          </View>

          {/* Trainer Notes */}
          <Text style={styles.inputLabel}>Trainer Instructions / Notes</Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="e.g. Rest 60s between sets, focus on progressive load..."
              placeholderTextColor={PLACEHOLDER_COLOR}
            />
          </View>

          {/* ── ROUTINE EXERCISES SECTION ── */}
          <View style={styles.exerciseSectionHeader}>
            <Text style={styles.sectionHeading}>
              Routine Exercises ({selectedExercises.length})
            </Text>
          </View>

          {selectedExercises.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="barbell-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No exercises added yet</Text>
              <Text style={styles.emptySubtitle}>
                Add exercises below to customize sets, reps, and target weights.
              </Text>
            </View>
          ) : (
            selectedExercises.map((item, index) => (
              <View key={index} style={styles.exerciseItemCard}>
                <View style={styles.exCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>
                      {index + 1}. {item.exercise_name}
                    </Text>
                    <View style={styles.catPill}>
                      <Text style={styles.catPillText}>{item.category}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveExercise(index)} activeOpacity={0.8}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                {/* Param inputs */}
                <View style={styles.paramGrid}>
                  <View style={styles.paramBox}>
                    <Text style={styles.paramLabel}>Sets</Text>
                    <TextInput
                      style={styles.paramInput}
                      keyboardType="numeric"
                      value={String(item.sets)}
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      onChangeText={(v) => handleUpdateExerciseParam(index, 'sets', parseInt(v, 10) || 1)}
                    />
                  </View>

                  <View style={styles.paramBox}>
                    <Text style={styles.paramLabel}>Reps</Text>
                    <TextInput
                      style={styles.paramInput}
                      value={item.reps}
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      onChangeText={(v) => handleUpdateExerciseParam(index, 'reps', v)}
                    />
                  </View>

                  <View style={styles.paramBox}>
                    <Text style={styles.paramLabel}>Rest (s)</Text>
                    <TextInput
                      style={styles.paramInput}
                      keyboardType="numeric"
                      value={String(item.rest_time)}
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      onChangeText={(v) => handleUpdateExerciseParam(index, 'rest_time', parseInt(v, 10) || 30)}
                    />
                  </View>

                  <View style={styles.paramBox}>
                    <Text style={styles.paramLabel}>Load</Text>
                    <TextInput
                      style={styles.paramInput}
                      value={item.target_weight || ''}
                      placeholder="50kg"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      onChangeText={(v) => handleUpdateExerciseParam(index, 'target_weight', v)}
                    />
                  </View>
                </View>
              </View>
            ))
          )}

          {/* "+ ADD EXERCISE" BUTTON - SAME PILL UI AS SAVE BUTTON */}
          <TouchableOpacity
            style={styles.addExercisePillBtn}
            onPress={() => setShowExerciseModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addExercisePillBtnText}>ADD EXERCISE TO ROUTINE</Text>
          </TouchableOpacity>

          {/* "SAVE & ACTIVATE PLAN" BUTTON */}
          <TouchableOpacity style={styles.savePlanBtn} onPress={handleSavePlan} activeOpacity={0.85}>
            <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.savePlanBtnText}>SAVE & ACTIVATE WORKOUT PLAN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── MODAL: Select Exercise from Categories ── */}
      <Modal visible={showExerciseModal} animationType="slide">
        <View style={[styles.modalSafeContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTopTitle}>Exercise Library</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Category Chips Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.modalCatScroll}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.modalCatChip,
                  activeCategory === cat && styles.modalCatChipActive,
                ]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.modalCatIconWrap,
                    activeCategory === cat && styles.modalCatIconWrapActive,
                  ]}
                >
                  <CategoryIcon
                    category={cat}
                    size={42}
                    isSelected={activeCategory === cat}
                  />
                </View>
                <Text
                  style={[
                    styles.modalCatChipText,
                    activeCategory === cat && styles.modalCatChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercise Items List */}
          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
            {filteredExercises.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                style={styles.exSelectItem}
                onPress={() => handleSelectExercise(ex)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.exSelectName}>{ex.name}</Text>
                  {ex.description ? (
                    <Text style={styles.exSelectDesc}>{ex.description}</Text>
                  ) : null}
                </View>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // ── HERO WITH CURVED ARC (Exact same as Profile Screen) ──
  fixedHeaderWrap: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 20,
  },
  heroFoliageContainer: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  foliageBg: {
    width: '100%',
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
    overflow: 'hidden',
  },
  foliageImage: {
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
  },
  foliageOverlay: {
    width: '100%',
    backgroundColor: 'rgba(6, 35, 22, 0.70)',
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 22,
  },
  foliageBrandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  foliageDivider: {
    width: 50,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginVertical: 8,
    borderRadius: 1,
  },
  foliageBrandSubtitle: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
    textAlign: 'center',
  },
  topLeftBackBtn: {
    position: 'absolute',
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    backgroundColor: '#FFFFFF',
  },
  whiteBody: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrap: {
    backgroundColor: '#EEF3F0',
    borderRadius: 9999,
    paddingHorizontal: 20,
    height: 52,
    justifyContent: 'center',
    marginBottom: 4,
  },
  textInput: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  textAreaWrap: {
    height: 76,
    borderRadius: 20,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  textAreaInput: {
    height: 52,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Duration chips
  durationChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  durationChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: rounded.full,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  durationChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Exercise section
  exerciseSectionHeader: {
    marginTop: 22,
    marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  exerciseItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  catPill: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  paramGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  paramBox: {
    flex: 1,
    backgroundColor: '#EEF3F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  paramLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  paramInput: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },

  // Action buttons (both matching pill style)
  addExercisePillBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  addExercisePillBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  savePlanBtn: {
    height: 52,
    backgroundColor: '#0F5132',
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#0F5132',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  savePlanBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // Modal styles
  modalSafeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTopTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalCatScroll: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCatChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    minWidth: 86,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  modalCatChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalCatIconWrap: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
    backgroundColor: 'transparent',
  },
  modalCatIconWrapActive: {
    backgroundColor: 'transparent',
  },
  modalCatChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalCatChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  exSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  exSelectName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exSelectDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
