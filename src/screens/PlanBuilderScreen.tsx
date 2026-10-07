import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, rounded, shadows } from '../theme/colors';
import { workoutService } from '../database/services/workoutService';
import { memberService } from '../database/services/memberService';
import { addWorkoutPlanToCalendar } from '../utils/calendar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Exercise, ExerciseCategory, Member, PlanExerciseItem } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanBuilder'>;

const CATEGORIES: ExerciseCategory[] = [
  'Chest',
  'Back',
  'Cardio',
  'Biceps',
  'Triceps',
  'Quadriceps',
  'Shoulders',
  'Hamstrings',
  'Hips',
  'Waist',
  'Calves',
  'Neck',
  'Forearms',
];

export const PlanBuilderScreen: React.FC<Props> = ({ route, navigation }) => {
  const { memberId } = route.params;

  const [member, setMember] = useState<Member | null>(null);
  const [title, setTitle] = useState('Strength & Hypertrophy Routine');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // 30-day default cycle
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('Focus on progressive overload and strict form.');

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
    if (!title.trim() || selectedExercises.length === 0) {
      Alert.alert('Required Info', 'Please provide a title and at least one exercise.');
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

      // Offer Google Calendar sync
      if (member) {
        Alert.alert(
          'Plan Saved Successfully',
          'The new workout plan is now active (any previous plan was auto-archived). Would you like to add this routine to the Calendar?',
          [
            {
              text: 'No, Just Save',
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Plan Builder</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Building routine for: <Text style={{ fontWeight: '800' }}>{member?.name || 'Member'}</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Plan Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan Duration & Notes</Text>

          <Text style={styles.label}>Plan Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. 4-Week Hypertrophy Split"
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-10-07"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-11-07"
              />
            </View>
          </View>

          <Text style={styles.label}>Trainer Instructions / Notes</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Special instructions, superset cues, rest days..."
          />
        </View>

        {/* Exercises Section */}
        <View style={styles.exerciseSectionHeader}>
          <Text style={styles.exerciseSectionTitle}>
            Routine Exercises ({selectedExercises.length})
          </Text>
          <TouchableOpacity
            style={styles.addExerciseBtn}
            onPress={() => setShowExerciseModal(true)}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {selectedExercises.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No exercises added yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Add Exercise" to browse pre-populated exercises across all 13 muscle categories.
            </Text>
          </View>
        ) : (
          selectedExercises.map((item, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName}>
                    {index + 1}. {item.exercise_name}
                  </Text>
                  <View style={styles.catPill}>
                    <Text style={styles.catPillText}>{item.category}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemoveExercise(index)}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Editable sets/reps grid */}
              <View style={styles.paramGrid}>
                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>Sets</Text>
                  <TextInput
                    style={styles.paramInput}
                    keyboardType="numeric"
                    value={String(item.sets)}
                    onChangeText={(v) => handleUpdateExerciseParam(index, 'sets', parseInt(v) || 1)}
                  />
                </View>

                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>Reps</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={item.reps}
                    onChangeText={(v) => handleUpdateExerciseParam(index, 'reps', v)}
                  />
                </View>

                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>Rest (s)</Text>
                  <TextInput
                    style={styles.paramInput}
                    keyboardType="numeric"
                    value={String(item.rest_time)}
                    onChangeText={(v) => handleUpdateExerciseParam(index, 'rest_time', parseInt(v) || 30)}
                  />
                </View>

                <View style={styles.paramBox}>
                  <Text style={styles.paramLabel}>Target Load</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={item.target_weight || ''}
                    placeholder="e.g. 50kg"
                    onChangeText={(v) => handleUpdateExerciseParam(index, 'target_weight', v)}
                  />
                </View>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.savePlanBtn} onPress={handleSavePlan} activeOpacity={0.85}>
          <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
          <Text style={styles.savePlanBtnText}>Save & Activate Workout Plan</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL: Select Exercise from 13 Pre-populated Categories */}
      <Modal visible={showExerciseModal} animationType="slide">
        <SafeAreaView style={styles.modalSafeContainer}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTopTitle}>Exercise Dictionary</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Muscle Category Selector Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  activeCategory === cat && styles.categoryPillActive,
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    activeCategory === cat && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercises in active category */}
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dictionaryItem}
                onPress={() => handleSelectExercise(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dictItemName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.dictItemDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="add-circle" size={26} color={colors.accent} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#A7F3D0',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
    ...shadows.soft,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  exerciseSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addExerciseBtn: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.full,
    gap: 6,
  },
  addExerciseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: rounded.lg,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.soft,
  },
  exCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  catPill: {
    backgroundColor: colors.sage,
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
  },
  paramLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paramInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  savePlanBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: rounded.md,
    marginTop: 16,
    marginBottom: 32,
    gap: 8,
    ...shadows.card,
  },
  savePlanBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal styles
  modalSafeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTopTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dictionaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: rounded.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dictItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dictItemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
