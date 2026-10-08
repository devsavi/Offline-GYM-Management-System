import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, rounded, shadows } from '../theme/colors';
import { memberService } from '../database/services/memberService';
import { measurementService } from '../database/services/measurementService';
import { workoutService } from '../database/services/workoutService';
import { paymentService } from '../database/services/paymentService';
import { useGymStore } from '../store/useGymStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  CustomMeasurementField,
  Exercise,
  ExerciseCategory,
  Member,
  PaymentPlan,
} from '../types';
import {
  HeightUnit,
  convertHeightToCm,
  getBMICategory,
} from './MemberProfileScreen';
import { CategoryIcon } from '../components/CategoryIcon';
import { ExerciseImage } from '../components/ExerciseImage';

const TOP_BAR_BG = require('../../public/top_bar.webp');
const PLACEHOLDER_COLOR = '#8B9E93';
const TITLE_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Coach', 'Trainer', 'Dr.'];

const DURATION_OPTIONS = ['1 Month', '2 Months', '3 Months', '6 Months', '12 Months', 'Custom'] as const;
type DurationOption = (typeof DURATION_OPTIONS)[number];

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

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Online / UPI'] as const;

export interface AddedExerciseItem {
  exercise_id: string;
  exercise_name: string;
  category: ExerciseCategory;
  day_of_week: string;
  sets: number;
  reps: string;
  rest_time: number;
  target_weight: string;
  notes?: string;
  image_uri?: string;
}

type TabType = 'info' | 'progress' | 'workout' | 'payment';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMember'>;

export const AddMemberModal: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { selectedLocation, refreshDashboard, paymentPlans, loadPaymentPlans } = useGymStore();

  const [activeTab, setActiveTab] = useState<TabType>('info');

  // ── TAB 1: BASIC INFO STATES ──
  const [title, setTitle] = useState('Mr.');
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [injuries, setInjuries] = useState('');
  const [fitnessGoals, setFitnessGoals] = useState('');

  // ── TAB 2: PROGRESS / BASELINE MEASUREMENT STATES ──
  const [customFields, setCustomFields] = useState<CustomMeasurementField[]>([]);
  const [measUnitWeight, setMeasUnitWeight] = useState<'kg' | 'lbs'>('kg');
  const [measUnitHeight, setMeasUnitHeight] = useState<HeightUnit>('cm');
  const [measUnitCircumference, setMeasUnitCircumference] = useState<'cm' | 'in'>('cm');
  const [measWeight, setMeasWeight] = useState('');
  const [measHeight, setMeasHeight] = useState('');
  const [measChest, setMeasChest] = useState('');
  const [measArms, setMeasArms] = useState('');
  const [measWaist, setMeasWaist] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [measDate, setMeasDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [measNotes, setMeasNotes] = useState('');

  // ── TAB 3: WORKOUT ROUTINE STATES ──
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutStartDate, setWorkoutStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [workoutDuration, setWorkoutDuration] = useState<DurationOption>('1 Month');
  const [workoutEndDate, setWorkoutEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<AddedExerciseItem[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [activeExerciseCategory, setActiveExerciseCategory] = useState<'All' | ExerciseCategory>('All');
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [exerciseModalMode, setExerciseModalMode] = useState<'library' | 'custom'>('library');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExerciseCategory, setCustomExerciseCategory] = useState<ExerciseCategory>('Chest');
  const [customExerciseDesc, setCustomExerciseDesc] = useState('');
  const [customExerciseImageUri, setCustomExerciseImageUri] = useState<string>('');
  const [isSubmittingCustomExercise, setIsSubmittingCustomExercise] = useState(false);
  // Multi-select state for exercise library
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

  // ── TAB 4: PAYMENT / MEMBERSHIP STATES ──
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [payStartDate, setPayStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payEndDate, setPayEndDate] = useState('');
  const [payStatus, setPayStatus] = useState<'paid' | 'unpaid'>('paid');
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [coveredMemberIds, setCoveredMemberIds] = useState<string[]>([]);
  const [locationMembers, setLocationMembers] = useState<Member[]>([]);
  const [loadingLocationMembers, setLoadingLocationMembers] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Load custom fields, payment plans, exercises & location members
  useEffect(() => {
    if (selectedLocation) {
      measurementService.getCustomFields(selectedLocation.id)
        .then((fields) => setCustomFields(fields))
        .catch((err) => console.warn('Could not load custom fields:', err));

      workoutService.getExercises()
        .then((exs) => setAllExercises(exs))
        .catch((err) => console.warn('Could not load exercises:', err));

      loadPaymentPlans().catch((err) => console.warn('Could not load payment plans:', err));

      setLoadingLocationMembers(true);
      memberService.getMembersByLocation(selectedLocation.id)
        .then((mems) => {
          setLocationMembers(mems);
          setLoadingLocationMembers(false);
        })
        .catch(() => setLoadingLocationMembers(false));
    }
  }, [selectedLocation]);

  // Compute live BMI for Progress Tab
  const calculateLiveBMI = () => {
    const rawW = parseFloat(measWeight);
    const rawH = parseFloat(measHeight);
    if (isNaN(rawW) || isNaN(rawH) || rawW <= 0 || rawH <= 0) return null;

    const wKg = measUnitWeight === 'lbs' ? rawW / 2.20462 : rawW;
    const hCm = convertHeightToCm(rawH, measUnitHeight);
    if (hCm <= 0) return null;

    const bmi = measurementService.calculateBMI(wKg, hCm);
    const cat = getBMICategory(bmi);
    return { bmi, cat };
  };

  const liveBMIInfo = calculateLiveBMI();

  // Photo Picker
  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant photo library access to upload a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  // Workout Duration & End Date Calculator
  const computeWorkoutEndDate = (start: string, months: number): string => {
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

  const handleSelectWorkoutDuration = (duration: DurationOption) => {
    setWorkoutDuration(duration);
    if (duration === '1 Month') setWorkoutEndDate(computeWorkoutEndDate(workoutStartDate, 1));
    else if (duration === '2 Months') setWorkoutEndDate(computeWorkoutEndDate(workoutStartDate, 2));
    else if (duration === '3 Months') setWorkoutEndDate(computeWorkoutEndDate(workoutStartDate, 3));
    else if (duration === '6 Months') setWorkoutEndDate(computeWorkoutEndDate(workoutStartDate, 6));
    else if (duration === '12 Months') setWorkoutEndDate(computeWorkoutEndDate(workoutStartDate, 12));
  };

  const handleWorkoutStartDateChange = (newStart: string) => {
    setWorkoutStartDate(newStart);
    if (workoutDuration === '1 Month') setWorkoutEndDate(computeWorkoutEndDate(newStart, 1));
    else if (workoutDuration === '2 Months') setWorkoutEndDate(computeWorkoutEndDate(newStart, 2));
    else if (workoutDuration === '3 Months') setWorkoutEndDate(computeWorkoutEndDate(newStart, 3));
    else if (workoutDuration === '6 Months') setWorkoutEndDate(computeWorkoutEndDate(newStart, 6));
    else if (workoutDuration === '12 Months') setWorkoutEndDate(computeWorkoutEndDate(newStart, 12));
  };

  // Exercise Management
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
              setCustomExerciseImageUri(dataUrl);
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
          setCustomExerciseImageUri(`data:${mime};base64,${asset.base64}`);
        } else {
          setCustomExerciseImageUri(asset.uri);
        }
      }
    } catch (err: any) {
      console.error('Image pick error:', err);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    const newItem: AddedExerciseItem = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category,
      day_of_week: 'Day 1',
      sets: 3,
      reps: '10-12',
      rest_time: 60,
      target_weight: 'Moderate',
      image_uri: exercise.image_uri,
    };
    setSelectedExercises((prev) => [...prev, newItem]);
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
    const newItems: AddedExerciseItem[] = toAdd.map((exercise) => ({
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      category: exercise.category,
      day_of_week: 'Day 1',
      sets: 3,
      reps: '10-12',
      rest_time: 60,
      target_weight: 'Moderate',
      image_uri: exercise.image_uri,
    }));
    setSelectedExercises((prev) => [...prev, ...newItems]);
    exitMultiSelect();
    setShowExerciseModal(false);
  };

  const handleCreateAndAddCustomExercise = async () => {
    if (!customExerciseName.trim()) {
      Alert.alert('Required', 'Please enter exercise name.');
      return;
    }
    setIsSubmittingCustomExercise(true);
    try {
      const created = await workoutService.addCustomExercise(
        customExerciseName.trim(),
        customExerciseCategory,
        customExerciseDesc.trim() || undefined,
        customExerciseImageUri.trim() || undefined
      );
      setAllExercises((prev) => [created, ...prev]);

      // Add to member routine
      handleAddExercise(created);

      // Reset form fields
      setCustomExerciseName('');
      setCustomExerciseDesc('');
      setCustomExerciseCategory('Chest');
      setCustomExerciseImageUri('');
      setExerciseModalMode('library');
      setShowExerciseModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add custom exercise');
    } finally {
      setIsSubmittingCustomExercise(false);
    }
  };

  const handleRemoveExercise = (idx: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateExercise = (
    idx: number,
    field: keyof AddedExerciseItem,
    value: any
  ) => {
    setSelectedExercises((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      return updated;
    });
  };

  // Quick routine template applicator
  const applyQuickTemplate = (templateName: string) => {
    if (templateName === 'Full Body Starter') {
      setWorkoutTitle('Full Body Starter Routine');
      const sampleNames = ['Bench Press', 'Barbell Squat', 'Lat Pulldown', 'Overhead Shoulder Press'];
      const matched = allExercises.filter((e) =>
        sampleNames.some((sn) => e.name.toLowerCase().includes(sn.toLowerCase()))
      );
      if (matched.length > 0) {
        setSelectedExercises(
          matched.slice(0, 5).map((e) => ({
            exercise_id: e.id,
            exercise_name: e.name,
            category: e.category,
            day_of_week: 'Day 1',
            sets: 3,
            reps: '10-12',
            rest_time: 60,
            target_weight: 'Moderate',
          }))
        );
      }
    } else if (templateName === 'Push / Pull Starter') {
      setWorkoutTitle('Push & Pull Foundations');
      const sampleNames = ['Bench Press', 'Pushups', 'Incline Dumbbell Press', 'Lat Pulldown', 'Barbell Row'];
      const matched = allExercises.filter((e) =>
        sampleNames.some((sn) => e.name.toLowerCase().includes(sn.toLowerCase()))
      );
      if (matched.length > 0) {
        setSelectedExercises(
          matched.slice(0, 5).map((e, idx) => ({
            exercise_id: e.id,
            exercise_name: e.name,
            category: e.category,
            day_of_week: idx < 3 ? 'Push Day' : 'Pull Day',
            sets: 3,
            reps: '10-12',
            rest_time: 60,
            target_weight: 'Moderate',
          }))
        );
      }
    }
  };

  // Payment Plan Selection & End Date Calculation
  const computePaymentEndDate = (plan: PaymentPlan, startDateStr: string): string => {
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const start = new Date(year, month, day);
    if (isNaN(start.getTime())) return '';
    const end = new Date(year, month, day);
    switch (plan.duration_unit) {
      case 'days': end.setDate(end.getDate() + plan.duration_value); break;
      case 'weeks': end.setDate(end.getDate() + plan.duration_value * 7); break;
      case 'months': end.setMonth(end.getMonth() + plan.duration_value); break;
      case 'years': end.setFullYear(end.getFullYear() + plan.duration_value); break;
    }
    end.setDate(end.getDate() - 1);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSelectPaymentPlan = (plan: PaymentPlan) => {
    if (selectedPlan?.id === plan.id) {
      // Toggle off / deselect
      setSelectedPlan(null);
      setPayEndDate('');
      setCoveredMemberIds([]);
      return;
    }
    setSelectedPlan(plan);
    const today = new Date().toISOString().split('T')[0];
    setPayStartDate(today);
    setPayEndDate(computePaymentEndDate(plan, today));
    setCoveredMemberIds([]);
  };

  const handlePayStartDateChange = (val: string) => {
    setPayStartDate(val);
    if (selectedPlan && val.trim().length === 10) {
      const computed = computePaymentEndDate(selectedPlan, val.trim());
      if (computed) setPayEndDate(computed);
    }
  };

  const handleToggleCoveredMember = (mId: string) => {
    if (!selectedPlan) return;
    const maxAdditional = Math.max(0, selectedPlan.member_limit - 1);
    if (coveredMemberIds.includes(mId)) {
      setCoveredMemberIds(coveredMemberIds.filter((id) => id !== mId));
    } else {
      if (coveredMemberIds.length >= maxAdditional) {
        Alert.alert(
          'Limit Reached',
          `This plan allows up to ${maxAdditional} additional family member${maxAdditional > 1 ? 's' : ''}.`
        );
        return;
      }
      setCoveredMemberIds([...coveredMemberIds, mId]);
    }
  };

  // Comprehensive Save Handler
  const handleSave = async () => {
    if (!name.trim()) {
      setActiveTab('info');
      Alert.alert('Required', 'Please enter member full name in the Info tab.');
      return;
    }
    if (!selectedLocation) {
      Alert.alert('Error', 'No active branch selected.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Create Member
      const newMember = await memberService.createMember({
        location_id: selectedLocation.id,
        title: title || undefined,
        name: name.trim(),
        photo_uri: avatarUri || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        injuries: injuries.trim() || undefined,
        fitness_goals: fitnessGoals.trim() || undefined,
        status: 'active',
      });

      // 2. Save Initial Body Measurements (if entered in Progress tab)
      const rawWeight = parseFloat(measWeight);
      const rawHeight = parseFloat(measHeight);
      const hasAnyMeasurement =
        measWeight.trim() !== '' ||
        measHeight.trim() !== '' ||
        measChest.trim() !== '' ||
        measArms.trim() !== '' ||
        measWaist.trim() !== '' ||
        Object.keys(customValues).some((k) => customValues[k].trim() !== '');

      if (hasAnyMeasurement) {
        const finalWeight =
          !isNaN(rawWeight) && rawWeight > 0
            ? measUnitWeight === 'lbs'
              ? Math.round((rawWeight / 2.20462) * 10) / 10
              : rawWeight
            : 0;

        const finalHeight =
          !isNaN(rawHeight) && rawHeight > 0
            ? convertHeightToCm(rawHeight, measUnitHeight)
            : 0;

        let finalChest: number | undefined;
        if (measChest.trim()) {
          const raw = parseFloat(measChest);
          if (!isNaN(raw)) {
            finalChest = measUnitCircumference === 'in' ? Math.round(raw * 2.54 * 10) / 10 : raw;
          }
        }

        let finalArms: number | undefined;
        if (measArms.trim()) {
          const raw = parseFloat(measArms);
          if (!isNaN(raw)) {
            finalArms = measUnitCircumference === 'in' ? Math.round(raw * 2.54 * 10) / 10 : raw;
          }
        }

        let finalWaist: number | undefined;
        if (measWaist.trim()) {
          const raw = parseFloat(measWaist);
          if (!isNaN(raw)) {
            finalWaist = measUnitCircumference === 'in' ? Math.round(raw * 2.54 * 10) / 10 : raw;
          }
        }

        const validCustomValues: Record<string, string> = {};
        for (const [k, v] of Object.entries(customValues)) {
          if (v && v.trim()) validCustomValues[k] = v.trim();
        }

        await measurementService.addMeasurement({
          member_id: newMember.id,
          date: measDate || new Date().toISOString().split('T')[0],
          weight: finalWeight,
          height: finalHeight,
          chest: finalChest,
          arms: finalArms,
          waist: finalWaist,
          custom_values: Object.keys(validCustomValues).length > 0 ? validCustomValues : undefined,
          notes: measNotes.trim() || 'Initial baseline measurements on registration',
        });
      }

      // 3. Save Workout Routine (if configured in Workout tab)
      if (workoutTitle.trim() && selectedExercises.length > 0) {
        await workoutService.createWorkoutPlan(
          {
            member_id: newMember.id,
            title: workoutTitle.trim(),
            start_date: workoutStartDate,
            end_date: workoutEndDate,
            notes: workoutNotes.trim() || undefined,
          },
          selectedExercises.map((e, idx) => ({
            exercise_id: e.exercise_id,
            day_of_week: e.day_of_week || 'Day 1',
            sets: Number(e.sets) || 3,
            reps: String(e.reps) || '10-12',
            rest_time: Number(e.rest_time) || 60,
            target_weight: e.target_weight || 'Moderate',
            order_index: idx,
            notes: e.notes || undefined,
          }))
        );
      }

      // 4. Assign Payment Plan (if selected in Payment tab)
      if (selectedPlan) {
        const coveredMembers = locationMembers
          .filter((m) => coveredMemberIds.includes(m.id))
          .map((m) => ({ id: m.id, name: m.name }));

        await paymentService.assignPlanToMember({
          memberId: newMember.id,
          locationId: selectedLocation.id,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.amount,
          currency: selectedPlan.currency,
          startDate: payStartDate,
          endDate: payEndDate || computePaymentEndDate(selectedPlan, payStartDate),
          periodType: 'custom',
          status: payStatus,
          paymentMethod: payMethod,
          notes: payNotes,
          primaryMemberName: newMember.name,
          coveredMembers: coveredMembers.length > 0 ? coveredMembers : undefined,
        });
      }

      await refreshDashboard();
      Alert.alert('Registration Complete 🎉', `${name} registered successfully with all details.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not register member');
    } finally {
      setIsSaving(false);
    }
  };

  // Indicators to show user what tabs have filled data
  const hasInfoFilled = name.trim().length > 0;
  const hasProgressFilled =
    measWeight.trim() !== '' ||
    measHeight.trim() !== '' ||
    measChest.trim() !== '' ||
    measArms.trim() !== '' ||
    measWaist.trim() !== '';
  const hasWorkoutFilled = workoutTitle.trim().length > 0 || selectedExercises.length > 0;
  const hasPaymentFilled = selectedPlan !== null;

  // Filtered exercises for modal
  const filteredExercises = allExercises.filter((e) => {
    const matchesCategory =
      activeExerciseCategory === 'All' || e.category === activeExerciseCategory;
    const matchesSearch =
      !exerciseSearchQuery.trim() ||
      e.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(exerciseSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screenContainer}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── TOP HERO WITH CURVED ARC (Matching Profile Screen) ── */}
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
              <Text style={styles.foliageBrandSubtitle}>
                The professional gym management platform.
              </Text>
            </View>
          </ImageBackground>

          {/* Top Right Close 'X' Button */}
          <TouchableOpacity
            style={[styles.topRightCloseBtn, { top: insets.top + 12 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cleanBody}>
          {/* Avatar Picker & Active Branch Header Card */}
          <View style={styles.profileHeaderBlock}>
            <TouchableOpacity
              style={styles.profileAvatarBox}
              onPress={handlePickAvatar}
              activeOpacity={0.85}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profileAvatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={38} color={colors.primary} />
                </View>
              )}
              <View style={styles.profileAvatarCameraBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.avatarHintText}>
              {avatarUri ? 'Change Profile Photo' : 'Upload Profile Photo'}
            </Text>

            {/* Active Branch Card */}
            <View style={styles.locationSelectorCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationSelectorLabel}>REGISTERING TO BRANCH</Text>
                <Text style={styles.locationSelectorValue} numberOfLines={1}>
                  {selectedLocation?.name || 'Main Gym'}
                </Text>
              </View>
              <View style={styles.locationTagBadge}>
                <Text style={styles.locationTagBadgeText}>Active</Text>
              </View>
            </View>
          </View>

          {/* ════ TAB NAVIGATION BAR (Info, Progress, Workout, Payment) ════ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabsContainer}
            contentContainerStyle={styles.categoryTabsContent}
          >
            {[
              { id: 'info' as const, label: 'Info', isFilled: hasInfoFilled },
              { id: 'progress' as const, label: 'Progress', isFilled: hasProgressFilled },
              { id: 'workout' as const, label: 'Workout', isFilled: hasWorkoutFilled },
              { id: 'payment' as const, label: 'Payment', isFilled: hasPaymentFilled },
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.categoryTabItem, activeTab === t.id && styles.categoryTabItemActive]}
                onPress={() => setActiveTab(t.id)}
                activeOpacity={0.7}
              >
                <View style={styles.tabLabelRow}>
                  <Text
                    style={[
                      styles.categoryTabText,
                      activeTab === t.id && styles.categoryTabTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                  {t.isFilled && <View style={styles.tabFilledDot} />}
                </View>
                {activeTab === t.id && <View style={styles.categoryTabIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ════ TAB 1: INFO (MEMBER PERSONAL DETAILS) ════ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'info' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeading}>Personal Information</Text>
              <Text style={styles.sectionSubheading}>Basic profile and contact details</Text>

              {/* Salutation / Title */}
              <Text style={styles.inputLabel}>Salutation / Title</Text>
              <View style={styles.titleChipRow}>
                {TITLE_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.titleChip, title === t && styles.titleChipActive]}
                    onPress={() => setTitle(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.titleChipText, title === t && styles.titleChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Full Name */}
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Sarah Jenkins"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Age & Gender Row */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 28"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={age}
                      onChangeText={setAge}
                    />
                  </View>
                </View>

                <View style={{ flex: 1.5, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {(['male', 'female', 'other'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                        onPress={() => setGender(g)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.genderBtnText,
                            gender === g && styles.genderBtnTextActive,
                          ]}
                        >
                          {g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Phone */}
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +1 (555) 019-2834"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* Email */}
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. sarah@example.com"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Address */}
              <Text style={styles.inputLabel}>Home Address</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="e.g. Apt 4B, 12 Park Avenue"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              {/* Emergency Contact */}
              <Text style={styles.inputLabel}>Emergency Contact (Name & Phone)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. John (Spouse) - 555-0199"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                />
              </View>

              {/* Fitness Goals */}
              <Text style={styles.inputLabel}>Fitness Goals</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Weight Loss, Muscle Building, Mobility"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  value={fitnessGoals}
                  onChangeText={setFitnessGoals}
                />
              </View>

              {/* Injuries / Medical Limitations */}
              <Text style={styles.inputLabel}>Prior Injuries / Medical Conditions</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="e.g. Lower back strain, knee surgery..."
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  value={injuries}
                  onChangeText={setInjuries}
                />
              </View>

              {/* Navigation Helper */}
              <View style={styles.tabNavRow}>
                <TouchableOpacity
                  style={styles.tabNavNextBtn}
                  onPress={() => setActiveTab('progress')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tabNavNextBtnText}>Next: Progress</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ════ TAB 2: PROGRESS (BASELINE BODY MEASUREMENTS & BMI) ════ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'progress' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeading}>Baseline Body Measurements</Text>
              <Text style={styles.sectionSubheading}>
                Optional: Initial physical metrics to track member progression
              </Text>

              {/* Unit Toggles Bar (Exact match with Member Profile) */}
              <View style={styles.unitToolbar}>
                <View style={styles.unitToolbarLeft}>
                  <Ionicons name="options-outline" size={15} color={colors.textSecondary} />
                  <Text style={styles.unitToolbarTitle}>Units:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitPillsRow}>
                  {/* Weight Toggle */}
                  <View style={styles.unitToggleGroup}>
                    <TouchableOpacity
                      style={[styles.unitTogglePill, measUnitWeight === 'kg' && styles.unitTogglePillActive]}
                      onPress={() => setMeasUnitWeight('kg')}
                    >
                      <Text style={[styles.unitTogglePillText, measUnitWeight === 'kg' && styles.unitTogglePillTextActive]}>kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitTogglePill, measUnitWeight === 'lbs' && styles.unitTogglePillActive]}
                      onPress={() => setMeasUnitWeight('lbs')}
                    >
                      <Text style={[styles.unitTogglePillText, measUnitWeight === 'lbs' && styles.unitTogglePillTextActive]}>lbs</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Height Toggle */}
                  <View style={styles.unitToggleGroup}>
                    {(['cm', 'm', 'mm', 'ft', 'in'] as const).map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[styles.unitTogglePill, measUnitHeight === unit && styles.unitTogglePillActive]}
                        onPress={() => setMeasUnitHeight(unit)}
                      >
                        <Text style={[styles.unitTogglePillText, measUnitHeight === unit && styles.unitTogglePillTextActive]}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Circumference Toggle */}
                  <View style={styles.unitToggleGroup}>
                    <TouchableOpacity
                      style={[styles.unitTogglePill, measUnitCircumference === 'cm' && styles.unitTogglePillActive]}
                      onPress={() => setMeasUnitCircumference('cm')}
                    >
                      <Text style={[styles.unitTogglePillText, measUnitCircumference === 'cm' && styles.unitTogglePillTextActive]}>cm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitTogglePill, measUnitCircumference === 'in' && styles.unitTogglePillActive]}
                      onPress={() => setMeasUnitCircumference('in')}
                    >
                      <Text style={[styles.unitTogglePillText, measUnitCircumference === 'in' && styles.unitTogglePillTextActive]}>in</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>

              {/* Weight & Height Inputs */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Weight ({measUnitWeight})</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={measUnitWeight === 'kg' ? 'e.g. 72.5' : 'e.g. 160'}
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measWeight}
                      onChangeText={setMeasWeight}
                    />
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Height ({measUnitHeight})</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={measUnitHeight === 'cm' ? 'e.g. 175' : measUnitHeight === 'ft' ? 'e.g. 5.8' : 'e.g. 1.75'}
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measHeight}
                      onChangeText={setMeasHeight}
                    />
                  </View>
                </View>
              </View>

              {/* Dynamic Live BMI Calculation Card */}
              {liveBMIInfo && liveBMIInfo.cat && (
                <View style={styles.bmiGraphCard}>
                  <View style={styles.bmiCardHeader}>
                    <View>
                      <Text style={styles.bmiCardTitle}>Live Calculated BMI</Text>
                      <Text style={styles.bmiCardDate}>Automated baseline health evaluation</Text>
                    </View>
                    <View style={[styles.bmiCategoryBadgeLarge, { backgroundColor: liveBMIInfo.cat.bgColor, borderColor: liveBMIInfo.cat.borderColor }]}>
                      <View style={[styles.bmiCategoryDotLarge, { backgroundColor: liveBMIInfo.cat.color }]} />
                      <Text style={[styles.bmiCategoryTextLarge, { color: liveBMIInfo.cat.color }]}>
                        {liveBMIInfo.cat.category}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bmiScoreRow}>
                    <Text style={styles.bmiScoreValue}>{liveBMIInfo.bmi}</Text>
                    <Text style={styles.bmiScoreUnit}>BMI</Text>
                    <Text style={[styles.bmiScoreCategoryLabel, { color: liveBMIInfo.cat.color }]}>
                      • {liveBMIInfo.cat.category} ({liveBMIInfo.cat.range})
                    </Text>
                  </View>

                  {/* Visual Reference Legend with Active Highlight */}
                  <View style={styles.bmiLegendRow}>
                    <View style={[styles.bmiLegendItem, liveBMIInfo.cat.category === 'Underweight' && styles.bmiLegendItemHighlight]}>
                      <View style={[styles.bmiLegendDot, { backgroundColor: '#2563EB' }]} />
                      <Text style={styles.bmiLegendText}>Underweight</Text>
                      <Text style={styles.bmiLegendRange}>&lt; 18.5</Text>
                    </View>
                    <View style={[styles.bmiLegendItem, liveBMIInfo.cat.category === 'Healthy weight' && styles.bmiLegendItemHighlight]}>
                      <View style={[styles.bmiLegendDot, { backgroundColor: '#059669' }]} />
                      <Text style={styles.bmiLegendText}>Healthy</Text>
                      <Text style={styles.bmiLegendRange}>18.5–24.9</Text>
                    </View>
                    <View style={[styles.bmiLegendItem, liveBMIInfo.cat.category === 'Overweight' && styles.bmiLegendItemHighlight]}>
                      <View style={[styles.bmiLegendDot, { backgroundColor: '#D97706' }]} />
                      <Text style={styles.bmiLegendText}>Overweight</Text>
                      <Text style={styles.bmiLegendRange}>25–29.9</Text>
                    </View>
                    <View style={[styles.bmiLegendItem, liveBMIInfo.cat.category === 'Obesity' && styles.bmiLegendItemHighlight]}>
                      <View style={[styles.bmiLegendDot, { backgroundColor: '#DC2626' }]} />
                      <Text style={styles.bmiLegendText}>Obesity</Text>
                      <Text style={styles.bmiLegendRange}>≥ 30</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Chest & Arms */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Chest ({measUnitCircumference})</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 98"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measChest}
                      onChangeText={setMeasChest}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Arms ({measUnitCircumference})</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 35"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measArms}
                      onChangeText={setMeasArms}
                    />
                  </View>
                </View>
              </View>

              {/* Waist */}
              <Text style={styles.inputLabel}>Waist ({measUnitCircumference})</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 82"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  keyboardType="numeric"
                  value={measWaist}
                  onChangeText={setMeasWaist}
                />
              </View>

              {/* Branch Custom Metrics (if configured) */}
              {customFields.length > 0 && (
                <View style={styles.customFieldsSection}>
                  <Text style={styles.customFieldsHeading}>
                    Branch Custom Metrics ({customFields.length})
                  </Text>
                  {customFields.map((cf) => (
                    <View key={cf.id} style={{ marginBottom: 4 }}>
                      <Text style={styles.inputLabel}>
                        {cf.name} ({cf.unit})
                      </Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder={`Value in ${cf.unit}`}
                          placeholderTextColor={PLACEHOLDER_COLOR}
                          keyboardType="numeric"
                          value={customValues[cf.name] || ''}
                          onChangeText={(txt) =>
                            setCustomValues((prev) => ({ ...prev, [cf.name]: txt }))
                          }
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Measurement Notes & Date */}
              <Text style={styles.inputLabel}>Measurement Date</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  value={measDate}
                  onChangeText={setMeasDate}
                />
              </View>

              <Text style={styles.inputLabel}>Measurement Notes</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="e.g. Measured before initial onboarding workout session"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  value={measNotes}
                  onChangeText={setMeasNotes}
                />
              </View>

              {/* Navigation Row */}
              <View style={styles.tabNavRowBetween}>
                <TouchableOpacity
                  style={styles.tabNavPrevBtn}
                  onPress={() => setActiveTab('info')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                  <Text style={styles.tabNavPrevBtnText}>Info</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tabNavNextBtn}
                  onPress={() => setActiveTab('workout')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tabNavNextBtnText}>Next: Workout</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ════ TAB 3: WORKOUT (INITIAL WORKOUT ROUTINE) ════ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'workout' && (
            <View style={styles.tabContent}>
              <View style={styles.headerWithActionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeading}>Initial Workout Routine</Text>
                  <Text style={styles.sectionSubheading}>
                    Optional: Build or assign an initial workout routine
                  </Text>
                </View>
              </View>

              {/* Quick Starter Routine Presets */}
              <View style={styles.quickTemplatesCard}>
                <Text style={styles.quickTemplatesTitle}>⚡ Quick Starters:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickTemplatesRow}>
                  <TouchableOpacity
                    style={styles.quickTemplatePill}
                    onPress={() => applyQuickTemplate('Full Body Starter')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="flash-outline" size={13} color={colors.primary} />
                    <Text style={styles.quickTemplatePillText}>Full Body Starter</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickTemplatePill}
                    onPress={() => applyQuickTemplate('Push / Pull Starter')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="barbell-outline" size={13} color={colors.primary} />
                    <Text style={styles.quickTemplatePillText}>Push & Pull</Text>
                  </TouchableOpacity>

                  {selectedExercises.length > 0 && (
                    <TouchableOpacity
                      style={[styles.quickTemplatePill, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
                      onPress={() => {
                        setSelectedExercises([]);
                        setWorkoutTitle('');
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={13} color="#DC2626" />
                      <Text style={[styles.quickTemplatePillText, { color: '#DC2626' }]}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>

              {/* Routine Title */}
              <Text style={styles.inputLabel}>Routine Title</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 3-Day Beginner Hypertrophy Split"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  value={workoutTitle}
                  onChangeText={setWorkoutTitle}
                />
              </View>

              {/* Duration Selector */}
              <Text style={styles.inputLabel}>Routine Duration</Text>
              <View style={styles.durationPillsRow}>
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.durationPill,
                      workoutDuration === opt && styles.durationPillActive,
                    ]}
                    onPress={() => handleSelectWorkoutDuration(opt)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        workoutDuration === opt && styles.durationPillTextActive,
                      ]}
                    >
                      {opt}
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
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      value={workoutStartDate}
                      onChangeText={handleWorkoutStartDateChange}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>End Date</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      value={workoutEndDate}
                      onChangeText={setWorkoutEndDate}
                    />
                  </View>
                </View>
              </View>

              {/* Routine Notes */}
              <Text style={styles.inputLabel}>Routine Notes</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="e.g. Warm up 5 mins, focus on mind-muscle connection"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  value={workoutNotes}
                  onChangeText={setWorkoutNotes}
                />
              </View>

              {/* Added Exercises List */}
              <View style={{ marginTop: 14 }}>
                <View style={styles.exerciseSectionHeader}>
                  <Text style={styles.exerciseSectionTitle}>
                    Assigned Exercises ({selectedExercises.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.addExerciseInlineBtn}
                    onPress={() => {
                      setExerciseModalMode('library');
                      setCustomExerciseImageUri('');
                      setShowExerciseModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.addExerciseInlineBtnText}>Add Exercise</Text>
                  </TouchableOpacity>
                </View>

                {selectedExercises.length === 0 ? (
                  <View style={styles.emptyExerciseBox}>
                    <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.emptyExerciseTitle}>No exercises added yet</Text>
                    <Text style={styles.emptyExerciseSubtitle}>
                      Tap "Add Exercise" or choose a Quick Starter above to assign exercises.
                    </Text>
                  </View>
                ) : (
                  selectedExercises.map((ex, idx) => (
                    <View key={`${ex.exercise_id}_${idx}`} style={styles.exerciseItemCard}>
                      <View style={styles.exerciseItemHeader}>
                        <View style={styles.exerciseOrderBadge}>
                          <Text style={styles.exerciseOrderText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.exerciseItemThumbWrap}>
                          <ExerciseImage
                            exercise={{
                              id: ex.exercise_id,
                              name: ex.exercise_name,
                              category: ex.category,
                              image_uri: ex.image_uri,
                            }}
                            size={40}
                            height={40}
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.exerciseItemName}>{ex.exercise_name}</Text>
                          <Text style={styles.exerciseItemCategory}>{ex.category}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveExercise(idx)}
                          style={styles.exerciseDeleteBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>

                      {/* Sets, Reps, Rest, Weight Row */}
                      <View style={styles.exerciseConfigRow}>
                        <View style={styles.exerciseConfigCol}>
                          <Text style={styles.exerciseConfigLabel}>Sets</Text>
                          <TextInput
                            style={styles.exerciseConfigInput}
                            keyboardType="numeric"
                            value={String(ex.sets)}
                            onChangeText={(val) => handleUpdateExercise(idx, 'sets', parseInt(val, 10) || 1)}
                          />
                        </View>
                        <View style={styles.exerciseConfigCol}>
                          <Text style={styles.exerciseConfigLabel}>Reps</Text>
                          <TextInput
                            style={styles.exerciseConfigInput}
                            value={ex.reps}
                            onChangeText={(val) => handleUpdateExercise(idx, 'reps', val)}
                          />
                        </View>
                        <View style={styles.exerciseConfigCol}>
                          <Text style={styles.exerciseConfigLabel}>Rest (s)</Text>
                          <TextInput
                            style={styles.exerciseConfigInput}
                            keyboardType="numeric"
                            value={String(ex.rest_time)}
                            onChangeText={(val) => handleUpdateExercise(idx, 'rest_time', parseInt(val, 10) || 0)}
                          />
                        </View>
                        <View style={[styles.exerciseConfigCol, { flex: 1.3 }]}>
                          <Text style={styles.exerciseConfigLabel}>Weight/Note</Text>
                          <TextInput
                            style={styles.exerciseConfigInput}
                            value={ex.target_weight}
                            onChangeText={(val) => handleUpdateExercise(idx, 'target_weight', val)}
                          />
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>



              {/* Navigation Row */}
              <View style={styles.tabNavRowBetween}>
                <TouchableOpacity
                  style={styles.tabNavPrevBtn}
                  onPress={() => setActiveTab('progress')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                  <Text style={styles.tabNavPrevBtnText}>Progress</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tabNavNextBtn}
                  onPress={() => setActiveTab('payment')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tabNavNextBtnText}>Next: Payment</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ════ TAB 4: PAYMENT (MEMBERSHIP PACKAGE & BILLING) ════ */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'payment' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeading}>Membership & Payment</Text>
              <Text style={styles.sectionSubheading}>
                Optional: Assign a membership package and record initial payment status
              </Text>

              {/* Payment Plans Selector */}
              <Text style={styles.inputLabel}>Select Membership Package</Text>

              {paymentPlans.length === 0 ? (
                <View style={styles.noPlansCard}>
                  <Ionicons name="card-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.noPlansTitle}>No Payment Plans Configured</Text>
                  <Text style={styles.noPlansDesc}>
                    You can add payment packages (Monthly, Annual, Family) in the User Profile later.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.plansSelectorRow}
                >
                  {paymentPlans
                    .filter((p) => p.is_active)
                    .map((plan) => {
                      const isSelected = selectedPlan?.id === plan.id;
                      return (
                        <TouchableOpacity
                          key={plan.id}
                          style={[
                            styles.planCardItem,
                            isSelected && styles.planCardItemActive,
                          ]}
                          onPress={() => handleSelectPaymentPlan(plan)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.planCardHeader}>
                            <Text
                              style={[
                                styles.planCardTitle,
                                isSelected && styles.planCardTitleActive,
                              ]}
                              numberOfLines={1}
                            >
                              {plan.name}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                            )}
                          </View>

                          <Text
                            style={[
                              styles.planCardAmount,
                              isSelected && styles.planCardAmountActive,
                            ]}
                          >
                            {plan.currency} {plan.amount.toLocaleString()}
                          </Text>

                          <Text style={styles.planCardDuration}>
                            ⏱ {plan.duration_value} {plan.duration_unit}
                          </Text>

                          {plan.member_limit > 1 && (
                            <View style={styles.planCardFamilyBadge}>
                              <Text style={styles.planCardFamilyText}>
                                👨‍👩‍👧 {plan.member_limit} Members
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              )}

              {/* Configured Plan Details */}
              {selectedPlan && (
                <View style={styles.selectedPlanConfigCard}>
                  <View style={styles.selectedPlanBanner}>
                    <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                    <Text style={styles.selectedPlanBannerText}>
                      Selected: <Text style={{ fontWeight: '800' }}>{selectedPlan.name}</Text> ({selectedPlan.currency} {selectedPlan.amount})
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedPlan(null)}
                      style={{ marginLeft: 'auto' }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Dates */}
                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Start Date</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={PLACEHOLDER_COLOR}
                          value={payStartDate}
                          onChangeText={handlePayStartDateChange}
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.inputLabel}>End Date</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={PLACEHOLDER_COLOR}
                          value={payEndDate}
                          onChangeText={setPayEndDate}
                        />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.dateHelperHint}>
                    Auto-calculated for {selectedPlan.duration_value} {selectedPlan.duration_unit}
                  </Text>

                  {/* Family Members Selector (if package allows > 1 member) */}
                  {selectedPlan.member_limit > 1 && (
                    <View style={{ marginTop: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.inputLabel}>
                          Covered Family Members ({coveredMemberIds.length} / {selectedPlan.member_limit - 1})
                        </Text>
                      </View>

                      {loadingLocationMembers ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
                      ) : locationMembers.length === 0 ? (
                        <Text style={styles.fieldSubhint}>
                          No other registered members found at this location to bundle yet.
                        </Text>
                      ) : (
                        <ScrollView style={styles.familyScrollList} nestedScrollEnabled>
                          {locationMembers.map((lm) => {
                            const isIncluded = coveredMemberIds.includes(lm.id);
                            return (
                              <TouchableOpacity
                                key={lm.id}
                                style={[
                                  styles.familyMemberSelectRow,
                                  isIncluded && styles.familyMemberSelectRowActive,
                                ]}
                                onPress={() => handleToggleCoveredMember(lm.id)}
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name={isIncluded ? 'checkbox' : 'square-outline'}
                                  size={18}
                                  color={isIncluded ? colors.primary : colors.textMuted}
                                />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                  <Text
                                    style={[
                                      styles.familyMemberSelectName,
                                      isIncluded && { color: colors.primary, fontWeight: '800' },
                                    ]}
                                  >
                                    {lm.name}
                                  </Text>
                                  <Text style={styles.familyMemberSelectPhone}>
                                    {lm.phone || 'No phone'}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* Payment Status Toggle */}
                  <Text style={styles.inputLabel}>Payment Status</Text>
                  <View style={styles.payStatusToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.payStatusToggleBtn,
                        payStatus === 'paid' && styles.payStatusToggleBtnPaidActive,
                      ]}
                      onPress={() => setPayStatus('paid')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={payStatus === 'paid' ? '#FFFFFF' : colors.primary}
                      />
                      <Text
                        style={[
                          styles.payStatusToggleBtnText,
                          payStatus === 'paid' && styles.payStatusToggleBtnTextActive,
                        ]}
                      >
                        Paid (Collected)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.payStatusToggleBtn,
                        payStatus === 'unpaid' && styles.payStatusToggleBtnUnpaidActive,
                      ]}
                      onPress={() => setPayStatus('unpaid')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={16}
                        color={payStatus === 'unpaid' ? '#FFFFFF' : '#DC2626'}
                      />
                      <Text
                        style={[
                          styles.payStatusToggleBtnText,
                          payStatus === 'unpaid' && styles.payStatusToggleBtnTextActive,
                        ]}
                      >
                        Unpaid (Pending)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Payment Method Chips */}
                  <Text style={styles.inputLabel}>Payment Method</Text>
                  <View style={styles.paymentMethodRow}>
                    {PAYMENT_METHODS.map((pm) => (
                      <TouchableOpacity
                        key={pm}
                        style={[
                          styles.methodChip,
                          payMethod === pm && styles.methodChipActive,
                        ]}
                        onPress={() => setPayMethod(pm)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.methodChipText,
                            payMethod === pm && styles.methodChipTextActive,
                          ]}
                        >
                          {pm}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Payment Notes */}
                  <Text style={styles.inputLabel}>Payment Notes</Text>
                  <View style={[styles.inputWrap, styles.textAreaWrap]}>
                    <TextInput
                      style={[styles.textInput, styles.textAreaInput]}
                      placeholder="e.g. Paid in cash at reception desk"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      multiline
                      value={payNotes}
                      onChangeText={setPayNotes}
                    />
                  </View>
                </View>
              )}

              {/* Navigation Helper */}
              <View style={styles.tabNavRowBetween}>
                <TouchableOpacity
                  style={styles.tabNavPrevBtn}
                  onPress={() => setActiveTab('workout')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                  <Text style={styles.tabNavPrevBtnText}>Workout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tabNavPrevBtn}
                  onPress={() => setActiveTab('info')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tabNavPrevBtnText}>Review Info</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════ PRIMARY SAVE / REGISTER BUTTON ════ */}
          <TouchableOpacity
            style={styles.saveActionBtn}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.saveBtnContentRow}>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.saveActionBtnText}>REGISTER MEMBER</Text>
              </View>
            )}
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
                    value={exerciseSearchQuery}
                    onChangeText={setExerciseSearchQuery}
                  />
                  {exerciseSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setExerciseSearchQuery('')}>
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
                      const isSelected = activeExerciseCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryCard,
                            isSelected && styles.categoryCardActive,
                          ]}
                          onPress={() => setActiveExerciseCategory(cat)}
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
                            handleAddExercise(ex);
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
                    value={customExerciseName}
                    onChangeText={setCustomExerciseName}
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
                    const isSelected = customExerciseCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryCard,
                          isSelected && styles.categoryCardActive,
                        ]}
                        onPress={() => setCustomExerciseCategory(cat as ExerciseCategory)}
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

                {customExerciseImageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <View style={styles.imagePreviewBox}>
                      <Image
                        source={{ uri: customExerciseImageUri }}
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
                        onPress={() => setCustomExerciseImageUri('')}
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
                    value={customExerciseDesc}
                    onChangeText={setCustomExerciseDesc}
                  />
                </View>

                <TouchableOpacity
                  style={styles.sheetSaveActionBtn}
                  onPress={handleCreateAndAddCustomExercise}
                  activeOpacity={0.85}
                  disabled={isSubmittingCustomExercise}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.sheetSaveActionBtnText}>
                    {isSubmittingCustomExercise ? 'ADDING TO ROUTINE...' : 'ADD EXERCISE TO ROUTINE'}
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
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── HERO WITH CURVED ARC (Matching Profile Screen) ──
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
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.90)',
    letterSpacing: 0.5,
  },
  topRightCloseBtn: {
    position: 'absolute',
    right: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },

  // ── BODY & SCROLL ──
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cleanBody: {
    width: '100%',
  },

  // ── AVATAR & BRANCH HEADER ──
  profileHeaderBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.card,
    position: 'relative',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  locationSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  locationSelectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  locationSelectorValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  locationTagBadge: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  locationTagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── TAB NAVIGATION BAR ──
  categoryTabsContainer: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 18,
    marginTop: 4,
  },
  categoryTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryTabItemActive: {},
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  tabFilledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  categoryTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  // ── TAB CONTENT CONTAINERS ──
  tabContent: {
    width: '100%',
    paddingBottom: 10,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubheading: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: 2,
  },
  headerWithActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: rounded.full,
  },
  actionBtnSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── COMMON INPUTS & FORMS ──
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
    paddingHorizontal: 18,
    height: 50,
    justifyContent: 'center',
    marginBottom: 4,
  },
  textAreaWrap: {
    height: 76,
    borderRadius: 18,
    paddingTop: 10,
    paddingBottom: 10,
    justifyContent: 'flex-start',
  },
  textInput: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  textAreaInput: {
    height: 56,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Title Chips
  titleChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  titleChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: rounded.full,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  titleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  titleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  titleChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Gender Buttons
  genderRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF3F0',
    borderRadius: 9999,
    padding: 3,
    height: 50,
    alignItems: 'center',
  },
  genderBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: colors.primary,
  },
  genderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  genderBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── PROGRESS TAB SPECIFICS ──
  unitToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  unitToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  unitToolbarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  unitPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: rounded.full,
    padding: 2,
  },
  unitTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  unitTogglePillActive: {
    backgroundColor: colors.primary,
  },
  unitTogglePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitTogglePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // BMI Card (Exact match with Member Profile)
  bmiGraphCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bmiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bmiCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  bmiCardDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  bmiCategoryBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
    borderWidth: 1,
    gap: 6,
  },
  bmiCategoryDotLarge: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bmiCategoryTextLarge: {
    fontSize: 12,
    fontWeight: '800',
  },
  bmiScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    gap: 6,
  },
  bmiScoreValue: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  bmiScoreUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  bmiScoreCategoryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  bmiLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  bmiLegendItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bmiLegendItemHighlight: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  bmiLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  bmiLegendText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  bmiLegendRange: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },

  // Custom metrics in Progress tab
  customFieldsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customFieldsHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },

  // ── WORKOUT TAB SPECIFICS ──
  quickTemplatesCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  quickTemplatesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  quickTemplatesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickTemplatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  quickTemplatePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  durationPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  durationPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: rounded.full,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  durationPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
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
  emptyExerciseBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyExerciseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptyExerciseSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  exerciseItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  exerciseItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseOrderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  exerciseItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exerciseItemCategory: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  exerciseDeleteBtn: {
    padding: 6,
  },
  exerciseConfigRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseConfigCol: {
    flex: 1,
  },
  exerciseConfigLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  exerciseConfigInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // ── PAYMENT TAB SPECIFICS ──
  noPlansCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 6,
  },
  noPlansTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 6,
  },
  noPlansDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  plansSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
    marginBottom: 6,
  },
  planCardItem: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    ...shadows.soft,
  },
  planCardItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  planCardTitleActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  planCardAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  planCardAmountActive: {
    color: colors.primary,
  },
  planCardDuration: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  planCardFamilyBadge: {
    marginTop: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  planCardFamilyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },

  selectedPlanConfigCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  selectedPlanBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  dateHelperHint: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },

  familyScrollList: {
    maxHeight: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    marginTop: 6,
  },
  familyMemberSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  familyMemberSelectRowActive: {
    backgroundColor: '#F0FDF4',
  },
  familyMemberSelectName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  familyMemberSelectPhone: {
    fontSize: 11,
    color: colors.textMuted,
  },
  fieldSubhint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Payment Status Toggle Buttons
  payStatusToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  payStatusToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  payStatusToggleBtnPaidActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  payStatusToggleBtnUnpaidActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  payStatusToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  payStatusToggleBtnTextActive: {
    color: '#FFFFFF',
  },

  // Payment Method Chips
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: rounded.full,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── TAB FOOTER NAVIGATION ──
  tabNavRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    marginBottom: 6,
  },
  tabNavRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  tabNavNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: rounded.full,
  },
  tabNavNextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabNavPrevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: rounded.full,
  },
  tabNavPrevBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // ── MAIN REGISTER ACTION BUTTON ──
  saveActionBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    ...shadows.card,
  },
  saveBtnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveActionBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // ── WORKOUT TAB "+ ADD EXERCISE TO ROUTINE" BUTTON ──
  addExercisePillBtn: {
    backgroundColor: '#0F5132',
    height: 52,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    shadowColor: '#0F5132',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addExercisePillBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    marginLeft: 8,
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
