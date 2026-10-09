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
  StatusBar,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
import { ExerciseImage } from '../components/ExerciseImage';

const TOP_BAR_BG = require('../../public/top_bar.webp');
const PLACEHOLDER_COLOR = '#8B9E93';

const DURATION_OPTIONS = ['1 Month', '2 Months', '3 Months', '6 Months', '12 Months', 'Custom'] as const;
type DurationOption = (typeof DURATION_OPTIONS)[number];

type Props = NativeStackScreenProps<RootStackParamList, 'PlanBuilder'>;

const CATEGORIES: ('All' | ExerciseCategory)[] = [
  'All',
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
  const [activeCategory, setActiveCategory] = useState<'All' | ExerciseCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [exerciseModalMode, setExerciseModalMode] = useState<'library' | 'custom'>('library');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>('Chest');
  const [customDescription, setCustomDescription] = useState('');
  const [customImageUri, setCustomImageUri] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Multi-select state for exercise library
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

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
      image_uri: exercise.image_uri,
    };

    setSelectedExercises([...selectedExercises, newItem]);
    setShowExerciseModal(false);
  };

  // Multi-select helpers
  const exitMultiSelect = () => {
    setIsMultiSelectMode(false);
    setMultiSelectedIds([]);
  };

  const handleExerciseLongPress = (exerciseId: string) => {
    setIsMultiSelectMode(true);
    setMultiSelectedIds([exerciseId]);
  };

  const handleMultiSelectToggle = (exerciseId: string) => {
    setMultiSelectedIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const handleAddAllSelected = () => {
    const toAdd = allExercises.filter((ex) => multiSelectedIds.includes(ex.id));
    const newItems: Omit<PlanExerciseItem, 'id' | 'workout_plan_id'>[] = toAdd.map((exercise, idx) => ({
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category,
      sets: 3,
      reps: '10-12',
      rest_time: 60,
      target_weight: 'Moderate',
      order_index: selectedExercises.length + idx,
      day_of_week: 'Day 1',
      image_uri: exercise.image_uri,
    }));
    setSelectedExercises((prev) => [...prev, ...newItems]);
    exitMultiSelect();
    setShowExerciseModal(false);
  };

  const handlePickExerciseImage = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.svg';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              setCustomImageUri(dataUrl);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow media library access to pick an exercise image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        base64: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || (asset.uri.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg');
          setCustomImageUri(`data:${mime};base64,${asset.base64}`);
        } else {
          setCustomImageUri(asset.uri);
        }
      }
    } catch (err: any) {
      console.error('Image pick error:', err);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleCreateAndAddCustomExercise = async () => {
    if (!customName.trim()) {
      Alert.alert('Required', 'Please enter exercise name.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await workoutService.addCustomExercise(
        customName.trim(),
        customCategory,
        customDescription.trim() || undefined,
        customImageUri.trim() || undefined
      );
      setAllExercises((prev) => [created, ...prev]);
      handleSelectExercise(created);
      setCustomName('');
      setCustomDescription('');
      setCustomCategory('Chest');
      setCustomImageUri('');
      setExerciseModalMode('library');
      setShowExerciseModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add custom exercise');
    } finally {
      setIsSubmitting(false);
    }
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

  const filteredExercises = allExercises.filter((e) => {
    const matchesCategory =
      activeCategory === 'All' || e.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <KeyboardAvoidingView
      behavior="padding"
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
            <TouchableOpacity
              style={styles.addExerciseInlineBtn}
              onPress={() => {
                setCustomImageUri('');
                setShowExerciseModal(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addExerciseInlineBtnText}>Add Exercise</Text>
            </TouchableOpacity>
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
                  <View style={styles.exerciseItemThumbWrap}>
                    <ExerciseImage
                      exercise={{
                        id: item.exercise_id,
                        name: item.exercise_name,
                        category: item.category,
                        image_uri: item.image_uri,
                      }}
                      size={40}
                      height={40}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
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



          {/* "SAVE & ACTIVATE PLAN" BUTTON */}
          <TouchableOpacity style={styles.savePlanBtn} onPress={handleSavePlan} activeOpacity={0.85}>
            <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.savePlanBtnText}>SAVE & ACTIVATE WORKOUT PLAN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── MODAL: Add Exercise to Routine (Matching Exercises Tab UI) ── */}
      <Modal
        visible={showExerciseModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowExerciseModal(false); exitMultiSelect(); }}
      >
        <View style={styles.sheetModalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => { setShowExerciseModal(false); exitMultiSelect(); }}
          />
          <View style={styles.sheetModalBox}>
            <View style={styles.sheetModalHeader}>
              <View>
                <Text style={styles.sheetModalTitle}>
                  {exerciseModalMode === 'library' ? 'Exercise Library' : 'New Exercise'}
                </Text>
                <Text style={styles.sheetModalSubtitle}>
                  {exerciseModalMode === 'library'
                    ? `${filteredExercises.length} movements available offline`
                    : 'Create and add custom movement to routine'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setShowExerciseModal(false); exitMultiSelect(); }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Segmented Mode Switcher */}
            <View style={styles.modalModeSelector}>
              <TouchableOpacity
                style={[
                  styles.modalModeBtn,
                  exerciseModalMode === 'library' && styles.modalModeBtnActive,
                ]}
                onPress={() => setExerciseModalMode('library')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="library-outline"
                  size={15}
                  color={exerciseModalMode === 'library' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modalModeBtnText,
                    exerciseModalMode === 'library' && styles.modalModeBtnTextActive,
                  ]}
                >
                  Choose From Library
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalModeBtn,
                  exerciseModalMode === 'custom' && styles.modalModeBtnActive,
                ]}
                onPress={() => setExerciseModalMode('custom')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={15}
                  color={exerciseModalMode === 'custom' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modalModeBtnText,
                    exerciseModalMode === 'custom' && styles.modalModeBtnTextActive,
                  ]}
                >
                  Create New Exercise
                </Text>
              </TouchableOpacity>
            </View>

            {exerciseModalMode === 'library' ? (
              <View style={{ flex: 1 }}>
                {/* Search Input */}
                <View style={styles.modalSearchBar}>
                  <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Search by exercise name..."
                    placeholderTextColor="#8B9E93"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Categories Horizontal Scroll with SVG Icons */}
                <View style={styles.modalCategoryContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.modalCategoryScrollContent}
                  >
                    {CATEGORIES.map((cat) => {
                      const isSelected = activeCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryCard,
                            isSelected && styles.categoryCardActive,
                          ]}
                          onPress={() => setActiveCategory(cat)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.categoryIconWrap,
                              isSelected && styles.categoryIconWrapActive,
                            ]}
                          >
                            <CategoryIcon
                              category={cat}
                              size={42}
                              isSelected={isSelected}
                            />
                          </View>
                          <Text
                            style={[
                              styles.categoryCardText,
                              isSelected && styles.categoryCardTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Exercises 2-Column Grid Matching Exercises Tab UI */}
                <FlatList<Exercise>
                  data={filteredExercises}
                  keyExtractor={(item: Exercise) => item.id}
                  numColumns={2}
                  columnWrapperStyle={styles.exerciseColumnWrapper}
                  contentContainerStyle={styles.exerciseGridListContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: ex }: { item: Exercise }) => {
                    const isSelected = multiSelectedIds.includes(ex.id);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.modalExerciseGridCard,
                          isMultiSelectMode && isSelected && styles.modalExerciseGridCardSelected,
                        ]}
                        onPress={() => {
                          if (isMultiSelectMode) {
                            handleMultiSelectToggle(ex.id);
                          } else {
                            handleSelectExercise(ex);
                          }
                        }}
                        onLongPress={() => handleExerciseLongPress(ex.id)}
                        delayLongPress={300}
                        activeOpacity={0.8}
                      >
                        {/* Exercise Image Container with Top-Right Badge/Add Pill */}
                        <View style={styles.modalCardImageContainer}>
                          <ExerciseImage
                            exercise={ex}
                            size={190}
                            height={200}
                          />
                          {isMultiSelectMode ? (
                            <View
                              style={[
                                styles.cardSelectBadge,
                                isSelected && styles.cardSelectBadgeActive,
                              ]}
                            >
                              {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                            </View>
                          ) : (
                            <View style={styles.cardAddPill}>
                              <Ionicons name="add" size={13} color="#FFFFFF" />
                              <Text style={styles.cardAddPillText}>Add</Text>
                            </View>
                          )}
                        </View>

                        {/* Card Details: Name, Category, and Description below */}
                        <View style={styles.modalCardBottomSection}>
                          <View style={styles.modalCardHeaderRow}>
                            <Text style={styles.modalExerciseName} numberOfLines={2}>
                              {ex.name}
                            </Text>
                            <View style={styles.categoryTag}>
                              <Text style={styles.categoryTagText}>{ex.category}</Text>
                            </View>
                          </View>

                          {ex.description ? (
                            <Text style={styles.modalExerciseDesc} numberOfLines={3}>
                              {ex.description}
                            </Text>
                          ) : null}

                          {ex.is_custom && (
                            <View style={styles.customBadge}>
                              <Text style={styles.customBadgeText}>Added</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.modalEmptyContainer}>
                      <Ionicons name="fitness-outline" size={44} color={colors.textMuted} />
                      <Text style={styles.modalEmptyText}>No exercises found</Text>
                      <Text style={styles.modalEmptySubtext}>
                        Adjust your search, choose another category, or switch to "Create New Exercise" above.
                      </Text>
                    </View>
                  }
                />

                {/* Multi-select bottom bar */}
                {isMultiSelectMode && (
                  <View style={styles.multiSelectBar}>
                    <TouchableOpacity style={styles.multiSelectCancelBtn} onPress={exitMultiSelect} activeOpacity={0.8}>
                      <Text style={styles.multiSelectCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.multiSelectAddBtn,
                        multiSelectedIds.length === 0 && { opacity: 0.5 },
                      ]}
                      onPress={handleAddAllSelected}
                      disabled={multiSelectedIds.length === 0}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                      <Text style={styles.multiSelectAddBtnText}>
                        Add Selected ({multiSelectedIds.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              /* New Exercise Form (Same as in Exercises Tab) */
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.inputLabel}>Exercise Name *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Incline Cable Flyes"
                    placeholderTextColor={colors.textMuted}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                </View>

                <Text style={styles.inputLabel}>Target Muscle Category *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.modalCategoryScroll}
                  contentContainerStyle={styles.modalCategoryScrollContent}
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => {
                    const isSelected = customCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryCard,
                          isSelected && styles.categoryCardActive,
                        ]}
                        onPress={() => setCustomCategory(cat as ExerciseCategory)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.categoryIconWrap,
                            isSelected && styles.categoryIconWrapActive,
                          ]}
                        >
                          <CategoryIcon
                            category={cat}
                            size={42}
                            isSelected={isSelected}
                          />
                        </View>
                        <Text
                          style={[
                            styles.categoryCardText,
                            isSelected && styles.categoryCardTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* ── Exercise Image Upload Option (Supports Any Format) ── */}
                <View style={styles.imageSectionHeader}>
                  <Text style={styles.inputLabel}>Exercise Image (Optional)</Text>
                  <Text style={styles.imageFormatHint}>Any format (PNG, JPG, SVG, WebP, GIF)</Text>
                </View>

                {customImageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <View style={styles.imagePreviewBox}>
                      <Image
                        source={{ uri: customImageUri }}
                        style={styles.imagePreviewThumb}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.imageActionBtns}>
                      <TouchableOpacity
                        style={styles.changeImageBtn}
                        onPress={handlePickExerciseImage}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="image-outline" size={16} color={colors.primary} />
                        <Text style={styles.changeImageBtnText}>Change Image</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setCustomImageUri('')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={styles.removeImageBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadDashedBox}
                    onPress={handlePickExerciseImage}
                    activeOpacity={0.8}
                  >
                    <View style={styles.uploadIconCircle}>
                      <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.uploadPromptText}>
                      Tap to add exercise image
                    </Text>
                    <Text style={styles.uploadPromptSubtext}>
                      Upload any image format or SVG illustration
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.inputLabel}>Description / Form Cues (Optional)</Text>
                <View style={[styles.inputWrap, styles.textAreaWrap]}>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    placeholder="e.g. Set bench to 30 degrees, maintain slight elbow bend..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    value={customDescription}
                    onChangeText={setCustomDescription}
                  />
                </View>

                <TouchableOpacity
                  style={styles.sheetSaveActionBtn}
                  onPress={handleCreateAndAddCustomExercise}
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.sheetSaveActionBtnText}>
                    {isSubmitting ? 'ADDING TO ROUTINE...' : 'ADD EXERCISE TO ROUTINE'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 8,
  },
  addExerciseInlineBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    gap: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addExerciseInlineBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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

  // ── BOTTOM SHEET MODAL (Matching Exercises Tab UI) ──
  sheetModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%',
  },
  sheetModalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    height: '92%',
    maxHeight: '92%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  sheetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sheetModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#EEF3F0',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 14,
  },
  modalModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  modalModeBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalModeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3F0',
    borderRadius: 9999,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalCategoryContainer: {
    marginBottom: 8,
  },
  modalCategoryScroll: {
    marginBottom: 6,
    marginTop: 2,
  },
  modalCategoryScrollContent: {
    paddingVertical: 4,
    paddingRight: 10,
  },
  categoryCard: {
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
  categoryCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIconWrap: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
    backgroundColor: 'transparent',
  },
  categoryIconWrapActive: {
    backgroundColor: 'transparent',
  },
  categoryCardText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryCardTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  exerciseItemThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  modalExerciseGridCard: {
    flex: 1,
    maxWidth: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  modalExerciseGridCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  modalCardImageContainer: {
    height: 175,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  cardAddPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 2,
  },
  cardAddPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardSelectBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSelectBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalCardBottomSection: {
    padding: 10,
  },
  modalCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  modalExerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 17,
  },
  modalExerciseDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 4,
  },
  exerciseColumnWrapper: {
    justifyContent: 'space-between',
    gap: 10,
  },
  exerciseGridListContent: {
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 24,
  },
  multiSelectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  multiSelectCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  multiSelectCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  multiSelectAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  multiSelectAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryTag: {
    backgroundColor: colors.sage,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  customBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  modalEmptyContainer: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  modalEmptySubtext: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  imageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 6,
    marginBottom: 4,
  },
  imageFormatHint: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  uploadDashedBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  uploadIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  uploadPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  uploadPromptSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 6,
  },
  imagePreviewBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePreviewThumb: {
    width: '100%',
    height: '100%',
  },
  imageActionBtns: {
    flex: 1,
    gap: 8,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F0',
    height: 34,
    borderRadius: 8,
    gap: 6,
  },
  changeImageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    height: 34,
    borderRadius: 8,
    gap: 6,
  },
  removeImageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  sheetSaveActionBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  sheetSaveActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
