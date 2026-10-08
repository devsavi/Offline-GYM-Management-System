import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { workoutService } from '../../database/services/workoutService';
import { Exercise, ExerciseCategory } from '../../types';
import { colors, rounded, shadows } from '../../theme/colors';
import { CategoryIcon } from '../../components/CategoryIcon';

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

export const ExercisesTab: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'All' | ExerciseCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Custom Exercise modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>('Chest');
  const [customDescription, setCustomDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const catParam = selectedCategory === 'All' ? undefined : selectedCategory;
      const data = await workoutService.getExercises(catParam);
      setExercises(data);
    } catch (e: any) {
      console.error('Failed to load exercises:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, [selectedCategory]);

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ex.description && ex.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenAddExercise = () => {
    setCustomName('');
    setCustomDescription('');
    setCustomCategory('Chest');
    setModalVisible(true);
  };

  const handleAddCustomExercise = async () => {
    if (!customName.trim()) {
      Alert.alert('Required', 'Please enter exercise name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await workoutService.addCustomExercise(
        customName.trim(),
        customCategory,
        customDescription.trim() || undefined
      );
      setCustomName('');
      setCustomDescription('');
      setModalVisible(false);
      Alert.alert('Success', 'New exercise registered.');
      loadExercises();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add custom exercise');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title & Add Exercise Button */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Exercise Library</Text>
          <Text style={styles.subtitle}>
            {filteredExercises.length} movements available offline
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addCustomBtn}
          onPress={handleOpenAddExercise}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addCustomBtnText}>Add Exercise</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
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

      {/* Categories Horizontal Scroll */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardActive,
                ]}
                onPress={() => setSelectedCategory(item)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.categoryIconWrap,
                    isSelected && styles.categoryIconWrapActive,
                  ]}
                >
                  <CategoryIcon
                    category={item}
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
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Exercises List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.exerciseCard}>
              <View style={styles.exerciseIconCircle}>
                <CategoryIcon category={item.category} size={28} />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{item.category}</Text>
                  </View>
                </View>
                {item.description ? (
                  <Text style={styles.exerciseDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : (
                  <Text style={styles.exerciseDescMuted}>Standard gym movement</Text>
                )}
                {item.is_custom && (
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>CUSTOM</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No exercises found</Text>
              <Text style={styles.emptySubtext}>Try adjusting search query or category</Text>
            </View>
          }
        />
      )}

      {/* ── MODAL: Create New Exercise (Same UI as New Gym Branch in Profile) ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.sheetModalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.sheetModalBox}>
            <View style={styles.sheetModalHeader}>
              <Text style={styles.sheetModalTitle}>New Exercise</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                onPress={handleAddCustomExercise}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                <Text style={styles.sheetSaveActionBtnText}>
                  {isSubmitting ? 'ADDING EXERCISE...' : 'ADD EXERCISE'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 9999,
    gap: 6,
    ...shadows.soft,
  },
  addCustomBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3F0',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoryContainer: {
    marginVertical: 8,
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    minWidth: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 10,
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
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exerciseIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  categoryTag: {
    backgroundColor: colors.sage,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  exerciseDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  exerciseDescMuted: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  customBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  // ── BOTTOM SHEET MODAL STYLES (Matching Add New Gym Branch UI) ──
  sheetModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheetModalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '88%',
  },
  sheetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
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
  },
  textAreaWrap: {
    borderRadius: 16,
    height: 80,
    paddingVertical: 12,
    justifyContent: 'flex-start',
  },
  textAreaInput: {
    flex: 1,
    textAlignVertical: 'top',
  },
  modalCategoryScroll: {
    marginBottom: 6,
    marginTop: 2,
  },
  modalCategoryScrollContent: {
    paddingVertical: 4,
    paddingRight: 10,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 5,
  },
  sheetSaveActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
