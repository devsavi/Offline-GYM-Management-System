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
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { workoutService } from '../../database/services/workoutService';
import { Exercise, ExerciseCategory } from '../../types';
import { colors, rounded, shadows } from '../../theme/colors';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ExerciseImage } from '../../components/ExerciseImage';

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

  // ── Selection / Delete Mode ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add Custom Exercise modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>('Chest');
  const [customDescription, setCustomDescription] = useState('');
  const [customImageUri, setCustomImageUri] = useState<string>('');
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

  // ── Selection helpers ──
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleLongPress = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const handleCardPress = (id: string) => {
    if (!selectionMode) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    const toDelete = exercises.filter((ex) => selectedIds.has(ex.id));
    const builtIn = toDelete.filter((ex) => !ex.is_custom);
    const custom = toDelete.filter((ex) => ex.is_custom);

    if (custom.length === 0) {
      Alert.alert(
        'Cannot Delete',
        'Built-in exercises cannot be deleted. Only your custom (Added) exercises can be removed.',
        [{ text: 'OK' }]
      );
      return;
    }

    const msg =
      builtIn.length > 0
        ? `${custom.length} custom exercise(s) will be permanently deleted. ${builtIn.length} built-in exercise(s) will be skipped.`
        : `Permanently delete ${custom.length} exercise(s)? This cannot be undone.`;

    Alert.alert('Delete Exercises', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const ex of custom) {
              await workoutService.deleteExercise(ex.id);
            }
            exitSelectionMode();
            loadExercises();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete exercises.');
          }
        },
      },
    ]);
  };

  const handleOpenAddExercise = () => {
    setCustomName('');
    setCustomDescription('');
    setCustomCategory('Chest');
    setCustomImageUri('');
    setModalVisible(true);
  };

  const handlePickExerciseImage = async () => {
    // For Web, provide HTML file input to support any format including raw SVG
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
        customDescription.trim() || undefined,
        customImageUri.trim() || undefined
      );
      setCustomName('');
      setCustomDescription('');
      setCustomImageUri('');
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
      {/* Header – switches between normal and selection mode */}
      {selectionMode ? (
        <View style={styles.selectionHeader}>
          <TouchableOpacity
            style={styles.selectionCancelBtn}
            onPress={exitSelectionMode}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedIds.size} selected
          </Text>
          <TouchableOpacity
            style={[
              styles.selectionDeleteBtn,
              selectedIds.size === 0 && styles.selectionDeleteBtnDisabled,
            ]}
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.selectionDeleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}

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

      {/* Exercises 2-Column Grid with Images (Light Theme) */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                style={[
                  styles.exerciseCard,
                  isSelected && styles.exerciseCardSelected,
                ]}
                activeOpacity={selectionMode ? 0.7 : 1}
                onPress={() => handleCardPress(item.id)}
                onLongPress={() => handleLongPress(item.id)}
                delayLongPress={350}
              >
                {/* Selection checkbox overlay */}
                {selectionMode && (
                  <View style={styles.selectionOverlay}>
                    <View style={[
                      styles.selectionCheckbox,
                      isSelected && styles.selectionCheckboxActive,
                    ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                )}

                {/* Exercise Image Container */}
                <View style={styles.cardImageContainer}>
                  <ExerciseImage
                    exercise={item}
                    size={220}
                    height={230}
                  />
                </View>

                {/* Card Details: Name, Category, and Description below */}
                <View style={styles.cardBottomSection}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{item.category}</Text>
                    </View>
                  </View>

                  {item.description ? (
                    <Text style={styles.exerciseDesc} numberOfLines={3}>
                      {item.description}
                    </Text>
                  ) : null}

                  {item.is_custom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Added</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No exercises found</Text>
              <Text style={styles.emptySubtext}>Try adjusting search query or category</Text>
            </View>
          }
        />
      )}

      {/* ── MODAL: Create New Exercise with Image Upload Option ── */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 12,
  },

  // ── Selection Mode Header ──
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  selectionCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCount: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectionDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 9999,
    gap: 6,
    ...shadows.soft,
  },
  selectionDeleteBtnDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.5,
  },
  selectionDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── 2-COLUMN EXERCISE CARD (Light Theme) ──
  exerciseCard: {
    flex: 1,
    maxWidth: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  exerciseCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1,
    backgroundColor: '#F0FBF4',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  selectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardImageContainer: {
    height: 210,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardBottomSection: {
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  categoryTag: {
    backgroundColor: colors.sage,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  exerciseDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  customBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
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

  // ── BOTTOM SHEET MODAL (Add Custom Exercise) ──
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

  // ── Image Picker in Add Exercise Modal ──
  imageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  imageFormatHint: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  uploadDashedBox: {
    height: 96,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginBottom: 4,
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
    marginBottom: 4,
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
    ...shadows.soft,
  },
  sheetSaveActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
