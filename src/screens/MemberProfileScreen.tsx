import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, rounded } from '../theme/colors';
import { memberService } from '../database/services/memberService';
import { measurementService } from '../database/services/measurementService';
import { workoutService } from '../database/services/workoutService';
import { paymentService } from '../database/services/paymentService';
import { checkInService } from '../database/services/checkInService';
import { planService } from '../database/services/planService';
import { exportWorkoutPlanPDF } from '../utils/pdfExport';
import { addWorkoutPlanToCalendar } from '../utils/calendar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  Member,
  Measurement,
  WorkoutPlan,
  Payment,
  PaymentPlan,
  CheckIn,
  CustomMeasurementField,
} from '../types';
import { useGymStore } from '../store/useGymStore';

const TOP_BAR_BG = require('../../public/top_bar.webp');
const PLACEHOLDER_COLOR = '#8B9E93';
const TITLE_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Coach', 'Trainer', 'Dr.'];

export type HeightUnit = 'cm' | 'm' | 'mm' | 'ft' | 'in';

export const convertHeightToCm = (val: number, unit: HeightUnit): number => {
  if (!val || val <= 0 || isNaN(val)) return 0;
  switch (unit) {
    case 'm': return Math.round(val * 100 * 10) / 10;
    case 'mm': return Math.round((val / 10) * 10) / 10;
    case 'ft': return Math.round(val * 30.48 * 10) / 10;
    case 'in': return Math.round(val * 2.54 * 10) / 10;
    case 'cm':
    default: return Math.round(val * 10) / 10;
  }
};

export interface BMICategoryInfo {
  category: 'Underweight' | 'Healthy weight' | 'Overweight' | 'Obesity';
  range: string;
  color: string;
  bgColor: string;
  borderColor: string;
  progressRatio: number; // 0 to 1 for visual scale positioning
}

export const getBMICategory = (bmi?: number): BMICategoryInfo | null => {
  if (!bmi || bmi <= 0) return null;
  if (bmi < 18.5) {
    return {
      category: 'Underweight',
      range: 'Under 18.5',
      color: '#2563EB',      // Blue
      bgColor: '#DBEAFE',    // Soft Blue
      borderColor: '#93C5FD',
      progressRatio: Math.min(Math.max((bmi / 35), 0.05), 0.24),
    };
  }
  if (bmi <= 24.9) {
    return {
      category: 'Healthy weight',
      range: '18.5 to 24.9',
      color: '#059669',      // Green
      bgColor: '#D1FAE5',    // Soft Green
      borderColor: '#6EE7B7',
      progressRatio: Math.min(Math.max(0.25 + ((bmi - 18.5) / (24.9 - 18.5)) * 0.25, 0.26), 0.49),
    };
  }
  if (bmi <= 29.9) {
    return {
      category: 'Overweight',
      range: '25 to 29.9',
      color: '#D97706',      // Yellow / Amber
      bgColor: '#FEF3C7',    // Soft Yellow
      borderColor: '#FCD34D',
      progressRatio: Math.min(Math.max(0.50 + ((bmi - 25) / (29.9 - 25)) * 0.25, 0.51), 0.74),
    };
  }
  return {
    category: 'Obesity',
    range: '30 and above',
    color: '#DC2626',        // Red
    bgColor: '#FEE2E2',      // Soft Red
    borderColor: '#FCA5A5',
    progressRatio: Math.min(Math.max(0.75 + ((bmi - 30) / 10) * 0.25, 0.76), 0.96),
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'MemberProfile'>;
type TabType = 'info' | 'progress' | 'workouts' | 'payments' | 'visits';

export const MemberProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { memberId } = route.params;
  const { selectedLocation, refreshDashboard, paymentPlans, setOpenProfileOnTab } = useGymStore();

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [member, setMember] = useState<Member | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [historicalPlans, setHistoricalPlans] = useState<WorkoutPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [customFields, setCustomFields] = useState<CustomMeasurementField[]>([]);
  const [loading, setLoading] = useState(true);

  // Unit Preferences State (custom select units for progress view)
  const [measUnitWeight, setMeasUnitWeight] = useState<'kg' | 'lbs'>('kg');
  const [measUnitHeight, setMeasUnitHeight] = useState<HeightUnit>('cm');
  const [measUnitCircumference, setMeasUnitCircumference] = useState<'cm' | 'in'>('cm');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('Mr.');
  const [editName, setEditName] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('male');
  const [editDob, setEditDob] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editInjuries, setEditInjuries] = useState('');
  const [editFitnessGoals, setEditFitnessGoals] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // New Measurement Modal State
  const [showMeasModal, setShowMeasModal] = useState(false);
  const [inputWeightUnit, setInputWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [inputHeightUnit, setInputHeightUnit] = useState<HeightUnit>('cm');
  const [inputCircumferenceUnit, setInputCircumferenceUnit] = useState<'cm' | 'in'>('cm');
  const [measWeight, setMeasWeight] = useState('');
  const [measHeight, setMeasHeight] = useState('');
  const [measChest, setMeasChest] = useState('');
  const [measArms, setMeasArms] = useState('');
  const [measWaist, setMeasWaist] = useState('');
  const [measCustomValues, setMeasCustomValues] = useState<Record<string, string>>({});
  const [measNotes, setMeasNotes] = useState('');

  // Inline Custom Field creation inside Measurement Modal (No + icon)
  const [showInlineCustomField, setShowInlineCustomField] = useState(false);
  const [inlineFieldName, setInlineFieldName] = useState('');
  const [inlineFieldUnit, setInlineFieldUnit] = useState('cm');

  // New Payment / Plan Assignment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [payStartDate, setPayStartDate] = useState('');
  const [payEndDate, setPayEndDate] = useState('');
  const [payStatus, setPayStatus] = useState<'paid' | 'unpaid'>('paid');
  const [payNotes, setPayNotes] = useState('');
  // Family / group plan: covered members list
  const [coveredMemberIds, setCoveredMemberIds] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Automatically refresh member profile data whenever screen gains focus (e.g. returning from PlanBuilder)
  useFocusEffect(
    useCallback(() => {
      loadAllMemberData(false);
    }, [memberId])
  );

  const loadAllMemberData = async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [m, measList, currentPlan, pastPlans, pays, visits, cFields] = await Promise.all([
        memberService.getMemberById(memberId),
        measurementService.getMeasurementsForMember(memberId),
        workoutService.getActivePlan(memberId),
        workoutService.getHistoricalPlans(memberId),
        paymentService.getMemberPayments(memberId),
        checkInService.getMemberCheckInHistory(memberId),
        selectedLocation ? measurementService.getCustomFields(selectedLocation.id) : [],
      ]);

      setMember(m);
      setMeasurements(measList);
      setActivePlan(currentPlan);
      setHistoricalPlans(pastPlans);
      setPayments(pays);
      setCheckIns(visits);
      setCustomFields(cFields);

      if (m) {
        setEditTitle(m.title || 'Mr.');
        setEditName(m.name || '');
        setEditPhotoUri(m.photo_uri || null);
        setEditAge(m.age ? String(m.age) : '');
        setEditGender(m.gender || 'male');
        setEditDob(m.dob || '');
        setEditPhone(m.phone || '');
        setEditEmail(m.email || '');
        setEditAddress(m.address || '');
        setEditEmergencyContact(m.emergency_contact || '');
        setEditInjuries(m.injuries || '');
        setEditFitnessGoals(m.fitness_goals || '');
        setEditStatus(m.status || 'active');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load member profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllMemberData(false);
    setIsRefreshing(false);
  };

  const formatWeight = (valKg?: number) => {
    if (!valKg || valKg <= 0) return null;
    if (measUnitWeight === 'lbs') {
      const lbs = Math.round(valKg * 2.20462 * 10) / 10;
      return `${lbs} lbs`;
    }
    return `${valKg} kg`;
  };

  const formatHeight = (valCm?: number) => {
    if (!valCm || valCm <= 0) return null;
    switch (measUnitHeight) {
      case 'm': {
        const m = Math.round((valCm / 100) * 100) / 100;
        return `${m} m`;
      }
      case 'mm': {
        const mm = Math.round(valCm * 10);
        return `${mm} mm`;
      }
      case 'ft': {
        const ft = Math.round((valCm / 30.48) * 100) / 100;
        return `${ft} ft`;
      }
      case 'in': {
        const inches = Math.round((valCm / 2.54) * 10) / 10;
        return `${inches} in`;
      }
      case 'cm':
      default:
        return `${Math.round(valCm * 10) / 10} cm`;
    }
  };

  const formatCircumference = (valCm?: number) => {
    if (!valCm || valCm <= 0) return null;
    if (measUnitCircumference === 'in') {
      const inches = Math.round((valCm / 2.54) * 10) / 10;
      return `${inches} in`;
    }
    return `${Math.round(valCm * 10) / 10} cm`;
  };

  const getLiveModalBMI = () => {
    const rawW = parseFloat(measWeight);
    const rawH = parseFloat(measHeight);
    if (isNaN(rawW) || rawW <= 0 || isNaN(rawH) || rawH <= 0) return null;
    const wKg = inputWeightUnit === 'lbs' ? rawW / 2.20462 : rawW;
    const hCm = convertHeightToCm(rawH, inputHeightUnit);
    if (hCm <= 0) return null;
    const hM = hCm / 100;
    const val = wKg / (hM * hM);
    return Math.round(val * 10) / 10;
  };

  const resetMeasurementForm = () => {
    setMeasWeight('');
    setMeasHeight('');
    setMeasChest('');
    setMeasArms('');
    setMeasWaist('');
    setMeasNotes('');
    setMeasCustomValues({});
    setShowInlineCustomField(false);
    setInlineFieldName('');
    setInlineFieldUnit('cm');
    setInputWeightUnit(measUnitWeight);
    setInputHeightUnit(measUnitHeight);
    setInputCircumferenceUnit(measUnitCircumference);
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo library access to change profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const pickedUri = result.assets[0].uri;
        setEditPhotoUri(pickedUri);
        if (!isEditing) {
          setIsEditing(true);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter member full name.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await memberService.updateMember(memberId, {
        title: editTitle ? editTitle.trim() : '',
        name: editName.trim(),
        photo_uri: editPhotoUri || '',
        age: editAge ? parseInt(editAge, 10) : (null as any),
        gender: editGender,
        dob: editDob.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        emergency_contact: editEmergencyContact.trim(),
        injuries: editInjuries.trim(),
        fitness_goals: editFitnessGoals.trim(),
        status: editStatus,
      });

      await loadAllMemberData();
      await refreshDashboard();
      setIsEditing(false);
      Alert.alert('Success', 'Member details updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update member profile');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Height and weight are NOT required as requested; normalize input units to metric for database & standard BMI
  const handleSaveMeasurement = async () => {
    const rawWeight = parseFloat(measWeight);
    const rawHeight = parseFloat(measHeight);
    const rawChest = measChest ? parseFloat(measChest) : undefined;
    const rawArms = measArms ? parseFloat(measArms) : undefined;
    const rawWaist = measWaist ? parseFloat(measWaist) : undefined;

    const weightNum = !isNaN(rawWeight) && rawWeight > 0
      ? (inputWeightUnit === 'lbs' ? Math.round((rawWeight / 2.20462) * 10) / 10 : rawWeight)
      : 0;

    const heightNum = !isNaN(rawHeight) && rawHeight > 0
      ? convertHeightToCm(rawHeight, inputHeightUnit)
      : 0;

    const chestNum = rawChest !== undefined
      ? (inputCircumferenceUnit === 'in' ? Math.round(rawChest * 2.54 * 10) / 10 : rawChest)
      : undefined;

    const armsNum = rawArms !== undefined
      ? (inputCircumferenceUnit === 'in' ? Math.round(rawArms * 2.54 * 10) / 10 : rawArms)
      : undefined;

    const waistNum = rawWaist !== undefined
      ? (inputCircumferenceUnit === 'in' ? Math.round(rawWaist * 2.54 * 10) / 10 : rawWaist)
      : undefined;

    try {
      // Filter non-empty custom values
      const validCustomValues: Record<string, string> = {};
      for (const [k, v] of Object.entries(measCustomValues)) {
        if (v && v.trim()) validCustomValues[k] = v.trim();
      }

      await measurementService.addMeasurement({
        member_id: memberId,
        date: new Date().toISOString().split('T')[0],
        weight: weightNum,
        height: heightNum,
        chest: chestNum,
        arms: armsNum,
        waist: waistNum,
        custom_values: Object.keys(validCustomValues).length > 0 ? validCustomValues : undefined,
        notes: measNotes.trim() || undefined,
      });

      setShowMeasModal(false);
      resetMeasurementForm();
      loadAllMemberData();
      Alert.alert('Saved', 'Measurement recorded successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record measurement');
    }
  };

  const handleCreateInlineCustomField = async () => {
    if (!selectedLocation || !inlineFieldName.trim()) {
      Alert.alert('Required', 'Please enter a metric name');
      return;
    }
    try {
      await measurementService.createCustomField(
        selectedLocation.id,
        inlineFieldName.trim(),
        inlineFieldUnit.trim() || 'cm'
      );
      setInlineFieldName('');
      setShowInlineCustomField(false);
      if (selectedLocation) {
        const updated = await measurementService.getCustomFields(selectedLocation.id);
        setCustomFields(updated);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add custom metric');
    }
  };

  const resetPaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    setPayStartDate('');
    setPayEndDate('');
    setPayStatus('paid');
    setPayNotes('');
    setCoveredMemberIds([]);
  };

  // Auto-compute end date from plan duration when plan or start date changes
  const computeEndDate = (plan: PaymentPlan, startDateStr: string): string => {
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
    end.setDate(end.getDate() - 1); // end is inclusive last day
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleStartDateChange = (val: string) => {
    setPayStartDate(val);
    if (selectedPlan && val.trim().length === 10) {
      const computed = computeEndDate(selectedPlan, val.trim());
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

  const handleSelectPlan = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    const today = new Date().toISOString().split('T')[0];
    setPayStartDate(today);
    setPayEndDate(computeEndDate(plan, today));
    setCoveredMemberIds([]);
    // Load members of same location if plan allows > 1 member
    if (plan.member_limit > 1 && selectedLocation) {
      setLoadingMembers(true);
      memberService
        .getMembersByLocation(selectedLocation.id)
        .then((mems) => {
          setAllMembers(mems.filter((m) => m.id !== memberId));
          setLoadingMembers(false);
        })
        .catch(() => {
          setLoadingMembers(false);
        });
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlan || !selectedLocation || !member) {
      Alert.alert('Missing Info', 'Please select a payment plan first.');
      return;
    }
    if (!payStartDate || !payEndDate) {
      Alert.alert('Missing Dates', 'Please provide start and end dates.');
      return;
    }

    const coveredMembers = allMembers.filter((m) => coveredMemberIds.includes(m.id));

    try {
      await paymentService.assignPlanToMember({
        memberId,
        locationId: selectedLocation.id,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        startDate: payStartDate,
        endDate: payEndDate,
        periodType: 'custom',
        status: payStatus,
        notes: payNotes,
        primaryMemberName: member.name,
        coveredMembers,
      });
      resetPaymentModal();
      loadAllMemberData();
      refreshDashboard();
      Alert.alert('Success ✅', `"${selectedPlan.name}" has been assigned to ${member.name}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleTogglePaymentStatus = (payment: Payment) => {
    const nextStatus = payment.status === 'paid' ? 'unpaid' : 'paid';
    Alert.alert(
      nextStatus === 'paid' ? 'Mark as Paid?' : 'Mark as Unpaid?',
      nextStatus === 'paid'
        ? `Confirm payment received for "${payment.plan_name || payment.period_label || 'this plan'}"?`
        : `Mark "${payment.plan_name || payment.period_label || 'this plan'}" as unpaid / pending fee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus === 'paid' ? 'Mark Paid' : 'Mark Unpaid',
          style: nextStatus === 'paid' ? 'default' : 'destructive',
          onPress: async () => {
            // Optimistic update — flip status in local state immediately (no blink)
            setPayments((prev) =>
              prev.map((p) => (p.id === payment.id ? { ...p, status: nextStatus } : p))
            );
            // Persist silently in background
            try {
              await paymentService.updateStatus(payment.id, nextStatus, 'Cash');
              refreshDashboard();
            } catch {
              // Revert on failure
              setPayments((prev) =>
                prev.map((p) => (p.id === payment.id ? { ...p, status: payment.status } : p))
              );
            }
          },
        },
      ]
    );
  };

  const handleDeletePayment = async (payment: Payment) => {
    Alert.alert(
      'Delete Payment Record',
      `Remove this "${payment.plan_name || payment.period_label}" payment record?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await paymentService.deletePayment(payment.id);
            loadAllMemberData();
            refreshDashboard();
          },
        },
      ]
    );
  };



  const handleExportPDF = async (plan: WorkoutPlan) => {
    if (!member) return;
    try {
      await exportWorkoutPlanPDF(member, plan, selectedLocation?.name || 'GripState');
    } catch (e: any) {
      Alert.alert('PDF Export Error', e.message);
    }
  };

  const handleSyncCalendar = async (plan: WorkoutPlan) => {
    if (!member) return;
    try {
      const eventId = await addWorkoutPlanToCalendar(member.name, plan);
      if (eventId) {
        Alert.alert('Calendar Synced 📅', `Workout schedule added to device calendar with reminders.`);
      } else {
        Alert.alert('Calendar Notice', 'Calendar permissions are required or calendar could not be accessed.');
      }
    } catch (e: any) {
      Alert.alert('Calendar Error', e.message);
    }
  };

  if (loading || !member) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Formatting display name avoiding duplicate title
  const rawTitle = member.title?.trim() || '';
  const rawName = member.name.trim();
  const displayName =
    rawTitle && !rawName.toLowerCase().startsWith(rawTitle.toLowerCase())
      ? `${rawTitle} ${rawName}`
      : rawName;

  const currentAvatar = isEditing ? (editPhotoUri || member.photo_uri) : member.photo_uri;

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
                {isEditing ? 'Editing Member Profile' : 'The professional gym management platform.'}
              </Text>
            </View>
          </ImageBackground>

          {/* Left Back Button */}
          <TouchableOpacity
            style={[styles.topLeftBackBtn, { top: insets.top + 12 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Right Edit / Cancel Toggle Button */}
          <TouchableOpacity
            style={[styles.topRightEditBtn, { top: insets.top + 12 }]}
            onPress={() => {
              if (isEditing) {
                // Cancel changes
                setEditTitle(member.title || 'Mr.');
                setEditName(member.name || '');
                setEditPhotoUri(member.photo_uri || null);
                setEditAge(member.age ? String(member.age) : '');
                setEditGender(member.gender || 'male');
                setEditDob(member.dob || '');
                setEditPhone(member.phone || '');
                setEditEmail(member.email || '');
                setEditAddress(member.address || '');
                setEditEmergencyContact(member.emergency_contact || '');
                setEditInjuries(member.injuries || '');
                setEditFitnessGoals(member.fitness_goals || '');
                setEditStatus(member.status || 'active');
                setIsEditing(false);
              } else {
                setActiveTab('info');
                setIsEditing(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name={isEditing ? 'close' : 'create-outline'} size={16} color="#FFFFFF" />
            <Text style={styles.topRightEditBtnText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SCROLLABLE BODY CONTENT (Clean Flat UI without box containers or bottom line) ── */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.cleanBody}>
          {/* Profile Header Avatar & Summary Block */}
          <View style={styles.profileHeaderBlock}>
            <TouchableOpacity
              style={styles.profileAvatarBox}
              onPress={handlePickAvatar}
              activeOpacity={0.85}
            >
              {currentAvatar ? (
                <Image source={{ uri: currentAvatar }} style={styles.profileAvatarImage} />
              ) : (
                <Text style={styles.profileAvatarInitial}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              )}
              {/* Camera Badge */}
              <View style={styles.profileAvatarCameraBadge}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.profileNameTitle}>{displayName}</Text>
            <Text style={styles.profileSubContact}>
              {member.phone || member.email || 'No direct contact registered'}
            </Text>

            {/* Status & Goals Row */}
            <View style={styles.headerPillsRow}>
              <View
                style={[
                  styles.statusBadge,
                  member.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    member.status === 'active' ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                  ]}
                >
                  {member.status.toUpperCase()}
                </Text>
              </View>

              {member.fitness_goals ? (
                <View style={styles.goalBadge}>
                  <Text style={styles.goalBadgeText} numberOfLines={1}>
                    🎯 {member.fitness_goals}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Active Branch Display */}
            <View style={styles.locationSelectorCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationSelectorLabel}>REGISTERED BRANCH</Text>
                <Text style={styles.locationSelectorValue} numberOfLines={1}>
                  {selectedLocation?.name || 'Main Branch'}
                </Text>
              </View>
              <View style={styles.branchTagBadge}>
                <Text style={styles.branchTagBadgeText}>Gym Member</Text>
              </View>
            </View>
          </View>

          {/* Tab Navigation Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabsContainer}
            contentContainerStyle={styles.categoryTabsContent}
          >
            {(
              [
                { id: 'info', label: isEditing ? 'Edit Profile' : 'Info' },
                { id: 'progress', label: 'Progress' },
                { id: 'workouts', label: 'Workouts' },
                { id: 'payments', label: 'Payments' },
                { id: 'visits', label: 'Visits' },
              ] as const
            ).map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.categoryTabItem, activeTab === t.id && styles.categoryTabItemActive]}
                onPress={() => {
                  setActiveTab(t.id);
                  if (t.id === 'workouts') {
                    workoutService.getActivePlan(memberId).then(setActivePlan).catch(() => {});
                    workoutService.getHistoricalPlans(memberId).then(setHistoricalPlans).catch(() => {});
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    activeTab === t.id && styles.categoryTabTextActive,
                  ]}
                >
                  {t.label}
                </Text>
                {activeTab === t.id && <View style={styles.categoryTabIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ════ TAB 1: INFO (FLAT UI, NO CONTAINER BOXES) ════ */}
          {activeTab === 'info' && (
            <View style={styles.tabContent}>
              {isEditing ? (
                /* EDIT MODE FORM */
                <View style={styles.fieldsSection}>
                  <Text style={styles.sectionHeading}>Edit Member Details</Text>

                  {/* Salutation / Title */}
                  <Text style={styles.inputLabel}>Salutation / Title</Text>
                  <View style={styles.titleChipRow}>
                    {TITLE_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.titleChip, editTitle === t && styles.titleChipActive]}
                        onPress={() => setEditTitle(t)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.titleChipText, editTitle === t && styles.titleChipTextActive]}>
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
                      value={editName}
                      onChangeText={setEditName}
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
                          value={editAge}
                          onChangeText={setEditAge}
                        />
                      </View>
                    </View>

                    <View style={{ flex: 1.5, marginLeft: 12 }}>
                      <Text style={styles.inputLabel}>Gender</Text>
                      <View style={styles.genderRow}>
                        {(['male', 'female', 'other'] as const).map((g) => (
                          <TouchableOpacity
                            key={g}
                            style={[styles.genderBtn, editGender === g && styles.genderBtnActive]}
                            onPress={() => setEditGender(g)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.genderBtnText,
                                editGender === g && styles.genderBtnTextActive,
                              ]}
                            >
                              {g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Date of Birth */}
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 1995-04-12"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      value={editDob}
                      onChangeText={setEditDob}
                    />
                  </View>

                  {/* Phone */}
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. +1 (555) 019-2834"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="phone-pad"
                      value={editPhone}
                      onChangeText={setEditPhone}
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
                      value={editEmail}
                      onChangeText={setEditEmail}
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
                      value={editAddress}
                      onChangeText={setEditAddress}
                    />
                  </View>

                  {/* Emergency Contact */}
                  <Text style={styles.inputLabel}>Emergency Contact</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. John (Spouse) - 555-0199"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      value={editEmergencyContact}
                      onChangeText={setEditEmergencyContact}
                    />
                  </View>

                  {/* Fitness Goals */}
                  <Text style={styles.inputLabel}>Fitness Goals</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Weight Loss, Muscle Building, Mobility"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      value={editFitnessGoals}
                      onChangeText={setEditFitnessGoals}
                    />
                  </View>

                  {/* Injuries / Limitations */}
                  <Text style={styles.inputLabel}>Prior Injuries / Medical Conditions</Text>
                  <View style={[styles.inputWrap, styles.textAreaWrap]}>
                    <TextInput
                      style={[styles.textInput, styles.textAreaInput]}
                      placeholder="e.g. Lower back strain, right knee surgery..."
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      multiline
                      value={editInjuries}
                      onChangeText={setEditInjuries}
                    />
                  </View>

                  {/* Status Toggle */}
                  <Text style={styles.inputLabel}>Membership Status</Text>
                  <View style={styles.statusToggleRow}>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, editStatus === 'active' && styles.statusToggleBtnActive]}
                      onPress={() => setEditStatus('active')}
                    >
                      <Text
                        style={[
                          styles.statusToggleBtnText,
                          editStatus === 'active' && styles.statusToggleBtnTextActive,
                        ]}
                      >
                        Active
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.statusToggleBtn, editStatus === 'inactive' && styles.statusToggleBtnInactive]}
                      onPress={() => setEditStatus('inactive')}
                    >
                      <Text
                        style={[
                          styles.statusToggleBtnText,
                          editStatus === 'inactive' && styles.statusToggleBtnTextActive,
                        ]}
                      >
                        Inactive
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Action Buttons */}
                  <TouchableOpacity
                    style={styles.saveActionBtn}
                    onPress={handleSaveEdit}
                    disabled={isSavingEdit}
                    activeOpacity={0.85}
                  >
                    {isSavingEdit ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveActionBtnText}>SAVE PROFILE CHANGES</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelActionBtn}
                    onPress={() => setIsEditing(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelActionBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* READ-ONLY VIEW (CLEAN FLAT ROWS, NO CONTAINER CARDS) */
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeading}>Personal Details</Text>
                    <TouchableOpacity
                      style={styles.inlineEditBtn}
                      onPress={() => setIsEditing(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={14} color={colors.primary} />
                      <Text style={styles.inlineEditBtnText}>Edit Details</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Salutation / Title</Text>
                    <Text style={styles.flatValue}>{member.title || 'Not specified'}</Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Full Name</Text>
                    <Text style={styles.flatValue}>{member.name}</Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Age / Gender</Text>
                    <Text style={styles.flatValue}>
                      {member.age ? `${member.age} yrs` : 'N/A'} • {member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : 'Not specified'}
                    </Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Date of Birth</Text>
                    <Text style={styles.flatValue}>{member.dob || 'Not specified'}</Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Phone Number</Text>
                    <Text style={styles.flatValue}>{member.phone || 'N/A'}</Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Email Address</Text>
                    <Text style={styles.flatValue}>{member.email || 'N/A'}</Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Home Address</Text>
                    <Text style={styles.flatValue}>{member.address || 'N/A'}</Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Emergency Contact</Text>
                    <Text style={styles.flatValue}>{member.emergency_contact || 'None registered'}</Text>
                  </View>

                  <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
                    <Text style={styles.sectionHeading}>Health & Fitness Focus</Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Fitness Goals</Text>
                    <Text style={styles.flatValue}>{member.fitness_goals || 'Not specified'}</Text>
                  </View>

                  <View style={styles.flatRow}>
                    <Text style={styles.flatLabel}>Injuries / Limitations</Text>
                    <Text style={[styles.flatValue, { color: member.injuries ? colors.danger : colors.textPrimary }]}>
                      {member.injuries || 'None reported'}
                    </Text>
                  </View>

                  {/* Primary Edit Button */}
                  <TouchableOpacity
                    style={styles.saveActionBtn}
                    onPress={() => setIsEditing(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveActionBtnText}>EDIT MEMBER DETAILS</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ════ TAB 2: PROGRESS (FLAT UI, CUSTOM UNITS, BMI GRAPH & CATEGORIES) ════ */}
          {activeTab === 'progress' && (
            <View style={styles.tabContent}>
              <View style={styles.actionHeaderRow}>
                <Text style={styles.sectionHeading}>Measurements History</Text>
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => {
                    resetMeasurementForm();
                    setShowMeasModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>New Measurement</Text>
                </TouchableOpacity>
              </View>

              {/* Custom Units Selector Bar */}
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

                  {/* Height Toggle: cm, m, mm, ft, in */}
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
                </ScrollView>
              </View>

              {/* BMI Overview & Category Card (Line graph removed as requested) */}
              {(() => {
                const latestBmiMeas = measurements.find((m) => m.bmi && m.bmi > 0);
                if (!latestBmiMeas || !latestBmiMeas.bmi) return null;
                const bmiCat = getBMICategory(latestBmiMeas.bmi);
                if (!bmiCat) return null;

                return (
                  <View style={styles.bmiGraphCard}>
                    <View style={styles.bmiCardHeader}>
                      <View>
                        <Text style={styles.bmiCardTitle}>BMI & Health Category</Text>
                        <Text style={styles.bmiCardDate}>Latest recorded: {latestBmiMeas.date}</Text>
                      </View>
                      <View style={[styles.bmiCategoryBadgeLarge, { backgroundColor: bmiCat.bgColor, borderColor: bmiCat.borderColor }]}>
                        <View style={[styles.bmiCategoryDotLarge, { backgroundColor: bmiCat.color }]} />
                        <Text style={[styles.bmiCategoryTextLarge, { color: bmiCat.color }]}>
                          {bmiCat.category}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bmiScoreRow}>
                      <Text style={styles.bmiScoreValue}>{latestBmiMeas.bmi}</Text>
                      <Text style={styles.bmiScoreUnit}>BMI</Text>
                      <Text style={[styles.bmiScoreCategoryLabel, { color: bmiCat.color }]}>
                        • {bmiCat.category} ({bmiCat.range})
                      </Text>
                    </View>

                    {/* Category Reference Cards with associated colors */}
                    <View style={styles.bmiLegendRow}>
                      <View style={[styles.bmiLegendItem, bmiCat.category === 'Underweight' && styles.bmiLegendItemHighlight]}>
                        <View style={[styles.bmiLegendDot, { backgroundColor: '#2563EB' }]} />
                        <Text style={styles.bmiLegendText}>Underweight</Text>
                        <Text style={styles.bmiLegendRange}>&lt; 18.5</Text>
                      </View>
                      <View style={[styles.bmiLegendItem, bmiCat.category === 'Healthy weight' && styles.bmiLegendItemHighlight]}>
                        <View style={[styles.bmiLegendDot, { backgroundColor: '#059669' }]} />
                        <Text style={styles.bmiLegendText}>Healthy weight</Text>
                        <Text style={styles.bmiLegendRange}>18.5–24.9</Text>
                      </View>
                      <View style={[styles.bmiLegendItem, bmiCat.category === 'Overweight' && styles.bmiLegendItemHighlight]}>
                        <View style={[styles.bmiLegendDot, { backgroundColor: '#D97706' }]} />
                        <Text style={styles.bmiLegendText}>Overweight</Text>
                        <Text style={styles.bmiLegendRange}>25–29.9</Text>
                      </View>
                      <View style={[styles.bmiLegendItem, bmiCat.category === 'Obesity' && styles.bmiLegendItemHighlight]}>
                        <View style={[styles.bmiLegendDot, { backgroundColor: '#DC2626' }]} />
                        <Text style={styles.bmiLegendText}>Obesity</Text>
                        <Text style={styles.bmiLegendRange}>≥ 30</Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {measurements.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="fitness-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No measurements recorded</Text>
                  <Text style={styles.emptySubtitle}>
                    Track progress with weight, height, BMI, chest, waist, or custom metrics.
                  </Text>
                </View>
              ) : (
                measurements.map((meas) => {
                  const bmiCat = meas.bmi && meas.bmi > 0 ? getBMICategory(meas.bmi) : null;

                  return (
                    <View key={meas.id} style={styles.flatMeasurementItem}>
                      <View style={styles.measHeader}>
                        <Text style={styles.measDateText}>{meas.date}</Text>
                        {meas.bmi && meas.bmi > 0 ? (
                          <View style={styles.bmiBadgeGroup}>
                            <View style={styles.bmiBadge}>
                              <Text style={styles.bmiBadgeText}>BMI: {meas.bmi}</Text>
                            </View>
                            {bmiCat && (
                              <View style={[styles.bmiCategoryBadge, { backgroundColor: bmiCat.bgColor, borderColor: bmiCat.borderColor }]}>
                                <View style={[styles.bmiCategoryDot, { backgroundColor: bmiCat.color }]} />
                                <Text style={[styles.bmiCategoryText, { color: bmiCat.color }]}>
                                  {bmiCat.category}
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.measGrid}>
                        {meas.weight && meas.weight > 0 ? (
                          <View style={styles.measCol}>
                            <Text style={styles.measParamLabel}>Weight</Text>
                            <Text style={styles.measParamVal}>{formatWeight(meas.weight)}</Text>
                          </View>
                        ) : null}
                        {meas.height && meas.height > 0 ? (
                          <View style={styles.measCol}>
                            <Text style={styles.measParamLabel}>Height</Text>
                            <Text style={styles.measParamVal}>{formatHeight(meas.height)}</Text>
                          </View>
                        ) : null}
                        {meas.chest ? (
                          <View style={styles.measCol}>
                            <Text style={styles.measParamLabel}>Chest</Text>
                            <Text style={styles.measParamVal}>{formatCircumference(meas.chest)}</Text>
                          </View>
                        ) : null}
                        {meas.waist ? (
                          <View style={styles.measCol}>
                            <Text style={styles.measParamLabel}>Waist</Text>
                            <Text style={styles.measParamVal}>{formatCircumference(meas.waist)}</Text>
                          </View>
                        ) : null}
                        {meas.arms ? (
                          <View style={styles.measCol}>
                            <Text style={styles.measParamLabel}>Arms</Text>
                            <Text style={styles.measParamVal}>{formatCircumference(meas.arms)}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Dynamic Custom Measurement values */}
                      {meas.custom_values && Object.keys(meas.custom_values).length > 0 && (
                        <View style={styles.customValuesBox}>
                          {Object.entries(meas.custom_values).map(([fieldName, val]) => (
                            <View key={fieldName} style={styles.customPill}>
                              <Text style={styles.customPillLabel}>{fieldName}:</Text>
                              <Text style={styles.customPillVal}>{String(val)}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {meas.notes ? (
                        <Text style={styles.measNotesText}>Note: {meas.notes}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ════ TAB 3: WORKOUT PLANS (FLAT UI) ════ */}
          {activeTab === 'workouts' && (
            <View style={styles.tabContent}>
              <View style={styles.actionHeaderRow}>
                <Text style={styles.sectionHeading}>Assigned Routines</Text>
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => navigation.navigate('PlanBuilder', { memberId })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>Build New Plan</Text>
                </TouchableOpacity>
              </View>

              {/* Currently Active Routine */}
              {activePlan ? (
                <View style={styles.flatPlanBlock}>
                  <View style={styles.planHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.activeRoutinePill}>
                        <Text style={styles.activeRoutinePillText}>ACTIVE WORKOUT</Text>
                      </View>
                      <Text style={styles.planTitle}>{activePlan.title}</Text>
                      <Text style={styles.planDates}>
                        {activePlan.start_date} → {activePlan.end_date}
                      </Text>
                    </View>
                  </View>

                  {activePlan.notes ? (
                    <Text style={styles.planNotesText}>Note: {activePlan.notes}</Text>
                  ) : null}

                  {/* Exercises list */}
                  <View style={styles.exerciseList}>
                    {(activePlan.exercises || []).map((ex, idx) => (
                      <View key={ex.id} style={styles.exerciseItemRow}>
                        <View style={styles.exerciseNum}>
                          <Text style={styles.exerciseNumText}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseItemName}>{ex.exercise_name}</Text>
                          <Text style={styles.exerciseItemMeta}>
                            {ex.category} • {ex.sets} sets × {ex.reps} reps • Rest: {ex.rest_time}s
                            {ex.target_weight ? ` • ${ex.target_weight}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Actions */}
                  <View style={styles.planActionRow}>
                    <TouchableOpacity
                      style={styles.pdfExportBtn}
                      onPress={() => handleExportPDF(activePlan)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.pdfExportBtnText}>Share / Print PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.calendarSyncBtn}
                      onPress={() => handleSyncCalendar(activePlan)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                      <Text style={styles.calendarSyncBtnText}>Add Calendar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="barbell-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No active workout plan</Text>
                  <Text style={styles.emptySubtitle}>
                    Build a workout routine for this member with targeted exercises and sets.
                  </Text>
                </View>
              )}

              {/* Historical Workout Plans */}
              {historicalPlans.length > 0 && (
                <View style={{ marginTop: 24 }}>
                  <Text style={styles.sectionHeading}>Expired / Past Plans ({historicalPlans.length})</Text>
                  {historicalPlans.map((pastPlan) => (
                    <View key={pastPlan.id} style={styles.flatPastPlanRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pastPlanTitle}>{pastPlan.title}</Text>
                        <Text style={styles.planDates}>Ended: {pastPlan.end_date}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.smallPdfBtn}
                        onPress={() => handleExportPDF(pastPlan)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                        <Text style={styles.smallPdfBtnText}>PDF</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ════ TAB 4: PAYMENTS & MEMBERSHIP PLANS ════ */}
          {activeTab === 'payments' && (
            <View style={styles.tabContent}>
              <View style={styles.actionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeading}>Membership & Billing</Text>
                  <Text style={styles.sectionSubheading}>
                    Manage active plans, dues, and payment records
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => {
                    resetPaymentModal();
                    setShowPaymentModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>Assign Plan</Text>
                </TouchableOpacity>
              </View>

              {/* Active Plan Card (if any paid plan covers today or latest is paid) */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const activePayment =
                  payments.find(
                    (p) =>
                      p.status === 'paid' &&
                      p.start_date &&
                      p.end_date &&
                      todayStr >= p.start_date &&
                      todayStr <= p.end_date
                  ) || payments.find((p) => p.status === 'paid');

                if (activePayment) {
                  const isCoveredByOther =
                    activePayment.payer_member_name &&
                    activePayment.payer_member_id &&
                    activePayment.payer_member_id !== memberId;

                  return (
                    <View style={styles.activePlanBanner}>
                      <View style={styles.activePlanHeaderRow}>
                        <View style={styles.activePlanBadge}>
                          <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                          <Text style={styles.activePlanBadgeText}>ACTIVE MEMBERSHIP</Text>
                        </View>
                        <Text style={styles.activePlanPrice}>
                          {activePayment.currency} {activePayment.amount.toLocaleString()}
                        </Text>
                      </View>

                      <Text style={styles.activePlanName}>
                        {activePayment.plan_name || activePayment.period_label || 'Standard Membership'}
                      </Text>

                      {/* Clear Start and End Dates */}
                      <View style={styles.activePlanDateBox}>
                        <View style={styles.dateCol}>
                          <Text style={styles.dateColLabel}>START DATE</Text>
                          <Text style={styles.dateColValue}>
                            {activePayment.start_date || activePayment.created_at?.split('T')[0] || '—'}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{ marginTop: 12 }} />
                        <View style={styles.dateCol}>
                          <Text style={styles.dateColLabel}>END DATE / DUE</Text>
                          <Text style={[styles.dateColValue, { color: colors.primary, fontWeight: '800' }]}>
                            {activePayment.end_date || activePayment.due_date || '—'}
                          </Text>
                        </View>
                      </View>

                      {/* Family plan badge if covered by other or covers others */}
                      {isCoveredByOther && (
                        <View style={styles.familyInfoBox}>
                          <Ionicons name="people" size={14} color="#15803D" />
                          <Text style={styles.familyInfoText}>
                            Family Package • Activated & covered by{' '}
                            <Text style={{ fontWeight: '700' }}>{activePayment.payer_member_name}</Text>
                          </Text>
                        </View>
                      )}

                      {!isCoveredByOther && activePayment.notes?.includes('Covers') && (
                        <View style={styles.familyInfoBox}>
                          <Ionicons name="people" size={14} color="#15803D" />
                          <Text style={styles.familyInfoText}>{activePayment.notes}</Text>
                        </View>
                      )}
                    </View>
                  );
                }

                // If no active paid plan
                const hasUnpaid = payments.some((p) => p.status === 'unpaid');
                return (
                  <View style={styles.noActivePlanBanner}>
                    <Ionicons
                      name={hasUnpaid ? 'alert-circle-outline' : 'information-circle-outline'}
                      size={24}
                      color={hasUnpaid ? '#DC2626' : colors.textMuted}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.noActivePlanTitle}>
                        {hasUnpaid ? 'Payment Pending' : 'No Active Membership Plan'}
                      </Text>
                      <Text style={styles.noActivePlanDesc}>
                        {hasUnpaid
                          ? 'This member has an unpaid fee. Update status once collected.'
                          : 'Assign a custom plan (Monthly, Family, Annual) to start membership.'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Payment Records History */}
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionHeading}>
                  Billing History ({payments.length})
                </Text>

                {payments.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="wallet-outline" size={40} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No payment records</Text>
                    <Text style={styles.emptySubtitle}>
                      Assign a membership plan above to track fees, payment dates, and active status.
                    </Text>
                  </View>
                ) : (
                  payments.map((p) => {
                    const isPaid = p.status === 'paid';
                    const isCovered =
                      p.payer_member_name &&
                      p.payer_member_id &&
                      p.payer_member_id !== memberId;

                    return (
                      <View key={p.id} style={styles.paymentCard}>
                        <View style={styles.paymentCardHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.paymentCardTitle}>
                                {p.plan_name || p.period_label || 'Membership Plan'}
                              </Text>
                              {isCovered && (
                                <View style={styles.coveredByTag}>
                                  <Ionicons name="people" size={10} color="#15803D" />
                                  <Text style={styles.coveredByTagText}>Family</Text>
                                </View>
                              )}
                            </View>

                            <Text style={styles.paymentCardAmount}>
                              {p.currency} {p.amount.toLocaleString()}
                              {p.amount === 0 && isCovered ? ' (Covered by primary)' : ''}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.paymentStatusToggle,
                              { backgroundColor: isPaid ? colors.successSoft : colors.dangerSoft },
                            ]}
                            onPress={() => handleTogglePaymentStatus(p)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={isPaid ? 'checkmark-circle' : 'close-circle'}
                              size={16}
                              color={isPaid ? colors.success : colors.danger}
                            />
                            <Text
                              style={[
                                styles.paymentStatusToggleText,
                                { color: isPaid ? colors.success : colors.danger },
                              ]}
                            >
                              {isPaid ? 'Paid' : 'Unpaid'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Dates info row */}
                        <View style={styles.paymentCardDatesRow}>
                          <View style={styles.dateBadge}>
                            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                            <Text style={styles.dateBadgeText}>
                              {p.start_date && p.end_date
                                ? `${p.start_date} → ${p.end_date}`
                                : `Due: ${p.due_date}`}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleDeletePayment(p)}
                            style={styles.deletePaymentBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={15} color="#DC2626" />
                          </TouchableOpacity>
                        </View>

                        {isCovered && (
                          <Text style={styles.paymentPayerText}>
                            Covered under family plan by: <Text style={{ fontWeight: '700' }}>{p.payer_member_name}</Text>
                          </Text>
                        )}

                        {p.notes && !isCovered && (
                          <Text style={styles.paymentCardNotes}>{p.notes}</Text>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* ════ TAB 5: VISITS (PROFESSIONAL TIMELINE, NO FRONT DESK TEXT) ════ */}
          {activeTab === 'visits' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeading}>Attendance & Visit History</Text>
              {checkIns.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No check-ins logged</Text>
                  <Text style={styles.emptySubtitle}>
                    Mark member present when they arrive at the gym branch.
                  </Text>
                </View>
              ) : (
                checkIns.map((ci) => {
                  const dateObj = new Date(ci.check_in_time);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) + ' • ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                    : ci.check_in_time;

                  // Clean note without "Front desk check-in"
                  const displayNote =
                    ci.notes && ci.notes !== 'Front desk check-in' && ci.notes !== 'Checked In'
                      ? ci.notes
                      : 'Checked-in';

                  return (
                    <View key={ci.id} style={styles.flatVisitRow}>
                      <View style={styles.visitIconBox}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.visitTimeText}>{formattedDate}</Text>
                        <Text style={styles.visitNoteText}>{displayNote}</Text>
                      </View>
                      <View style={styles.checkedInBadge}>
                        <Text style={styles.checkedInBadgeText}>Checked In</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── MODAL: Record Measurement (Height/Weight NOT required, Custom field inside, reset on save) ── */}
      <Modal visible={showMeasModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Body Measurement</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowMeasModal(false);
                  resetMeasurementForm();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Unit Switcher Bar for Input */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalUnitSelectorRow}>
                <View style={styles.modalUnitGroup}>
                  <Text style={styles.modalUnitLabel}>Weight:</Text>
                  <TouchableOpacity
                    style={[styles.modalUnitPill, inputWeightUnit === 'kg' && styles.modalUnitPillActive]}
                    onPress={() => setInputWeightUnit('kg')}
                  >
                    <Text style={[styles.modalUnitPillText, inputWeightUnit === 'kg' && styles.modalUnitPillTextActive]}>kg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalUnitPill, inputWeightUnit === 'lbs' && styles.modalUnitPillActive]}
                    onPress={() => setInputWeightUnit('lbs')}
                  >
                    <Text style={[styles.modalUnitPillText, inputWeightUnit === 'lbs' && styles.modalUnitPillTextActive]}>lbs</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.modalUnitGroup, { marginLeft: 10 }]}>
                  <Text style={styles.modalUnitLabel}>Height:</Text>
                  {(['cm', 'm', 'mm', 'ft', 'in'] as const).map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.modalUnitPill, inputHeightUnit === unit && styles.modalUnitPillActive]}
                      onPress={() => setInputHeightUnit(unit)}
                    >
                      <Text style={[styles.modalUnitPillText, inputHeightUnit === unit && styles.modalUnitPillTextActive]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Real-time Calculated BMI Preview (with category color) */}
              {(() => {
                const liveBmi = getLiveModalBMI();
                if (!liveBmi) return null;
                const cat = getBMICategory(liveBmi);
                if (!cat) return null;

                return (
                  <View style={[styles.modalLiveBmiCard, { backgroundColor: cat.bgColor, borderColor: cat.borderColor }]}>
                    <View style={styles.modalLiveBmiHeader}>
                      <Text style={[styles.modalLiveBmiTitle, { color: cat.color }]}>
                        Calculated BMI: {liveBmi}
                      </Text>
                      <View style={[styles.bmiCategoryBadge, { backgroundColor: '#FFFFFF', borderColor: cat.borderColor }]}>
                        <View style={[styles.bmiCategoryDot, { backgroundColor: cat.color }]} />
                        <Text style={[styles.bmiCategoryText, { color: cat.color }]}>
                          {cat.category}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.modalLiveBmiSub, { color: cat.color }]}>
                      Category: {cat.category} ({cat.range})
                    </Text>
                  </View>
                );
              })()}

              {/* Weight & Height - Optional as requested */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Weight ({inputWeightUnit})</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={inputWeightUnit === 'kg' ? 'e.g. 75.5' : 'e.g. 166'}
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measWeight}
                      onChangeText={setMeasWeight}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Height ({inputHeightUnit})</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={
                        inputHeightUnit === 'm'
                          ? 'e.g. 1.78'
                          : inputHeightUnit === 'mm'
                          ? 'e.g. 1780'
                          : inputHeightUnit === 'ft'
                          ? 'e.g. 5.84'
                          : inputHeightUnit === 'in'
                          ? 'e.g. 70'
                          : 'e.g. 178'
                      }
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measHeight}
                      onChangeText={setMeasHeight}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Chest ({inputCircumferenceUnit})</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={inputCircumferenceUnit === 'cm' ? 'e.g. 102' : 'e.g. 40'}
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measChest}
                      onChangeText={setMeasChest}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Arms ({inputCircumferenceUnit})</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={inputCircumferenceUnit === 'cm' ? 'e.g. 38' : 'e.g. 15'}
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measArms}
                      onChangeText={setMeasArms}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Waist ({inputCircumferenceUnit})</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder={inputCircumferenceUnit === 'cm' ? 'e.g. 84' : 'e.g. 33'}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  keyboardType="numeric"
                  value={measWaist}
                  onChangeText={setMeasWaist}
                />
              </View>

              {/* Dynamic Branch Custom Fields */}
              {customFields.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.primary, fontWeight: '700' }]}>
                    Tracked Custom Metrics:
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
                          value={measCustomValues[cf.name] || ''}
                          onChangeText={(txt) =>
                            setMeasCustomValues((prev) => ({ ...prev, [cf.name]: txt }))
                          }
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Custom field creator moved INSIDE measurement modal, NO + icon */}
              {!showInlineCustomField ? (
                <TouchableOpacity
                  style={styles.addCustomMetricBtn}
                  onPress={() => setShowInlineCustomField(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addCustomMetricBtnText}>Add Custom Metric</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.inlineCustomFieldBox}>
                  <Text style={styles.inlineCustomFieldTitle}>New Custom Metric Field</Text>
                  <Text style={styles.inputLabel}>Metric Name</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Left Thigh, Body Fat %"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      value={inlineFieldName}
                      onChangeText={setInlineFieldName}
                    />
                  </View>

                  <Text style={styles.inputLabel}>Unit (e.g. cm, %, in)</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. cm"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      value={inlineFieldUnit}
                      onChangeText={setInlineFieldUnit}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.inlineActionBtn, { backgroundColor: colors.primary }]}
                      onPress={handleCreateInlineCustomField}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.inlineActionBtnText, { color: '#FFFFFF' }]}>Create Field</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.inlineActionBtn, { backgroundColor: '#EEF3F0' }]}
                      onPress={() => setShowInlineCustomField(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.inlineActionBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>Measurement Notes</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="Client progress notes..."
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  value={measNotes}
                  onChangeText={setMeasNotes}
                />
              </View>

              <TouchableOpacity style={styles.saveActionBtn} onPress={handleSaveMeasurement} activeOpacity={0.85}>
                <Text style={styles.saveActionBtnText}>SAVE MEASUREMENT</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Assign Payment Plan ── */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Payment Plan</Text>
                <Text style={styles.modalSubtitle}>For {member?.name || 'Member'}</Text>
              </View>
              <TouchableOpacity onPress={resetPaymentModal} activeOpacity={0.8}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Step 1: Select Plan */}
              <Text style={styles.modalSectionTitle}>1. Choose Payment Plan</Text>

              {paymentPlans.length === 0 ? (
                <View style={styles.noPlansEmptyState}>
                  <Ionicons name="card-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.noPlansEmptyTitle}>No Payment Plans Yet</Text>
                  <Text style={styles.noPlansEmptySubtitle}>
                    Create membership packages (Monthly, Family, Annual, etc.) in the User Profile before assigning them to members.
                  </Text>
                  <TouchableOpacity
                    style={styles.goToPaymentsBtn}
                    onPress={() => {
                      resetPaymentModal();
                      setOpenProfileOnTab('payments');
                      navigation.goBack();
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.goToPaymentsBtnText}>Add Plan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.planSelectorRow}
                >
                  {paymentPlans
                    .filter((p) => p.is_active)
                    .map((plan) => {
                      const isSelected = selectedPlan?.id === plan.id;
                      return (
                        <TouchableOpacity
                          key={plan.id}
                          style={[
                            styles.planChoiceCard,
                            isSelected && styles.planChoiceCardActive,
                          ]}
                          onPress={() => handleSelectPlan(plan)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.planChoiceHeader}>
                            <Text
                              style={[
                                styles.planChoiceName,
                                isSelected && styles.planChoiceNameActive,
                              ]}
                              numberOfLines={1}
                            >
                              {plan.name}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                            )}
                          </View>

                          <Text
                            style={[
                              styles.planChoiceAmount,
                              isSelected && styles.planChoiceAmountActive,
                            ]}
                          >
                            {plan.currency} {plan.amount.toLocaleString()}
                          </Text>

                          <Text style={styles.planChoiceDuration}>
                            ⏱ {plan.duration_value} {plan.duration_unit}
                          </Text>

                          {plan.member_limit > 1 && (
                            <View style={styles.planChoiceFamilyBadge}>
                              <Text style={styles.planChoiceFamilyText}>
                                👨‍👩‍👧 {plan.member_limit} Members
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              )}

              {/* Step 2: Dates (Start & End Dates clearly shown) */}
              {selectedPlan && (
                <>
                  <Text style={[styles.modalSectionTitle, { marginTop: 18 }]}>
                    2. Plan Dates & Schedule
                  </Text>

                  <View style={styles.datesInputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="2026-10-08"
                          placeholderTextColor={PLACEHOLDER_COLOR}
                          value={payStartDate}
                          onChangeText={handleStartDateChange}
                        />
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="2026-11-07"
                          placeholderTextColor={PLACEHOLDER_COLOR}
                          value={payEndDate}
                          onChangeText={setPayEndDate}
                        />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.dateHelperHint}>
                    Auto-calculated: {selectedPlan.duration_value} {selectedPlan.duration_unit} duration from start date
                  </Text>

                  {/* Step 3: Family Package - Covered Members */}
                  {selectedPlan.member_limit > 1 && (
                    <View style={{ marginTop: 18 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.modalSectionTitle}>
                          3. Covered Family Members
                        </Text>
                        <Text style={styles.familyCountBadge}>
                          {coveredMemberIds.length} / {selectedPlan.member_limit - 1} added
                        </Text>
                      </View>
                      <Text style={styles.fieldSubhint}>
                        Select up to {selectedPlan.member_limit - 1} additional members. They will automatically be marked active/covered under this plan.
                      </Text>

                      {loadingMembers ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: 14 }} />
                      ) : allMembers.length === 0 ? (
                        <Text style={styles.noFamilyMembersText}>
                          No other registered members found at this location to add.
                        </Text>
                      ) : (
                        <ScrollView style={styles.membersCheckboxList} nestedScrollEnabled>
                          {allMembers.map((m) => {
                            const isSelected = coveredMemberIds.includes(m.id);
                            return (
                              <TouchableOpacity
                                key={m.id}
                                style={[
                                  styles.familyMemberSelectRow,
                                  isSelected && styles.familyMemberSelectRowActive,
                                ]}
                                onPress={() => handleToggleCoveredMember(m.id)}
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name={isSelected ? 'checkbox' : 'square-outline'}
                                  size={20}
                                  color={isSelected ? colors.primary : colors.textMuted}
                                />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                  <Text
                                    style={[
                                      styles.familyMemberSelectName,
                                      isSelected && { color: colors.primary, fontWeight: '800' },
                                    ]}
                                  >
                                    {m.name}
                                  </Text>
                                  <Text style={styles.familyMemberSelectPhone}>
                                    {m.phone || m.email || 'No contact'}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* Step 4: Payment Status */}
                  <Text style={[styles.modalSectionTitle, { marginTop: 18 }]}>
                    Payment Status
                  </Text>
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
                        Paid (Immediate Active)
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
                        name="time-outline"
                        size={16}
                        color={payStatus === 'unpaid' ? '#FFFFFF' : colors.primary}
                      />
                      <Text
                        style={[
                          styles.payStatusToggleBtnText,
                          payStatus === 'unpaid' && styles.payStatusToggleBtnTextActive,
                        ]}
                      >
                        Unpaid (Pending Fee)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Notes */}
                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                    Notes / Remarks (Optional)
                  </Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Paid in cash at front desk"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      value={payNotes}
                      onChangeText={setPayNotes}
                    />
                  </View>

                  {/* Assign Button */}
                  <TouchableOpacity
                    style={[styles.saveActionBtn, { marginTop: 20 }]}
                    onPress={handleAssignPlan}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.saveActionBtnText}>
                      ASSIGN {selectedPlan.name.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={resetPaymentModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  // ── HERO WITH CURVED ARC (Exact same as Profile Screen) ──
  fixedHeaderWrap: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 25,
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
  topRightEditBtn: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
  },
  topRightEditBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── SCROLL CONTENT (Seamless white, no container cutoff gap) ──
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    backgroundColor: '#FFFFFF',
  },
  cleanBody: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ── Profile Overview Header ──
  profileHeaderBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarBox: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EEF3F0',
    borderWidth: 2.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  profileAvatarInitial: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary,
  },
  profileAvatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileNameTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  profileSubContact: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  headerPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  statusBadgeActive: {
    backgroundColor: colors.mintSoft,
  },
  statusBadgeInactive: {
    backgroundColor: colors.dangerSoft,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    color: colors.primary,
  },
  statusBadgeTextInactive: {
    color: colors.danger,
  },
  goalBadge: {
    backgroundColor: '#EEF3F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
    maxWidth: 200,
  },
  goalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  locationSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 14,
    width: '100%',
  },
  locationSelectorLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  locationSelectorValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  branchTagBadge: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  branchTagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Tab Navigation Bar ──
  categoryTabsContainer: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 20,
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
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
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

  // ── Tab Body Content (No container boxes) ──
  tabContent: {
    paddingBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  inlineEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
    backgroundColor: colors.mintSoft,
  },
  inlineEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // Flat Info Rows (No cards!)
  flatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  flatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  flatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },

  // ── Form & Edit Styling ──
  fieldsSection: {
    width: '100%',
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
  textAreaWrap: {
    height: 76,
    borderRadius: 20,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  textInput: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  textAreaInput: {
    height: 52,
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
    marginBottom: 6,
  },
  titleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    height: 52,
    alignItems: 'center',
  },
  genderBtn: {
    flex: 1,
    height: 46,
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

  // Status Toggle
  statusToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF3F0',
    borderRadius: 9999,
    padding: 4,
    height: 52,
    alignItems: 'center',
    marginBottom: 8,
  },
  statusToggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  statusToggleBtnInactive: {
    backgroundColor: colors.primary,
  },
  statusToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusToggleBtnTextActive: {
    color: '#FFFFFF',
  },

  // Action Buttons
  saveActionBtn: {
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
  saveActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cancelActionBtn: {
    height: 48,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF3F0',
    marginBottom: 16,
  },
  cancelActionBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Progress Tab (Flat Items, No container box) ──
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: rounded.full,
    gap: 6,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  flatMeasurementItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  measHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  measDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bmiBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bmiBadge: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  bmiBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  bmiCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    gap: 4,
  },
  bmiCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bmiCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Unit Selector Toolbar in Progress Tab
  unitToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitToolbarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unitPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#EEF3F0',
    borderRadius: 9999,
    padding: 2,
  },
  unitTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  unitTogglePillActive: {
    backgroundColor: colors.primary,
  },
  unitTogglePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  unitTogglePillTextActive: {
    color: '#FFFFFF',
  },

  // BMI Graph Card & Scale
  bmiGraphCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bmiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    gap: 5,
  },
  bmiCategoryDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bmiCategoryTextLarge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bmiScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  bmiScoreValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  bmiScoreUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  bmiScoreCategoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  bmiLegendItemHighlight: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bmiLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
    flexWrap: 'wrap',
  },
  bmiLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bmiLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  bmiLegendText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bmiLegendRange: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // Modal Unit Selector & Live BMI preview
  modalUnitSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalUnitGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalUnitLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalUnitPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#EEF3F0',
  },
  modalUnitPillActive: {
    backgroundColor: colors.primary,
  },
  modalUnitPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalUnitPillTextActive: {
    color: '#FFFFFF',
  },
  modalLiveBmiCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  modalLiveBmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLiveBmiTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalLiveBmiSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  measGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measCol: {
    backgroundColor: '#EEF3F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  measParamLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  measParamVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  customValuesBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  customPill: {
    flexDirection: 'row',
    backgroundColor: '#EEF3F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.full,
    gap: 4,
  },
  customPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  customPillVal: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  measNotesText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Add Custom Metric Button Inside Measurement Modal (No + icon)
  addCustomMetricBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: '#EEF3F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  addCustomMetricBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  inlineCustomFieldBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inlineCustomFieldTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  inlineActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Workouts Tab ──
  flatPlanBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 14,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  activeRoutinePill: {
    backgroundColor: colors.mintSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  activeRoutinePillText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  planDates: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planNotesText: {
    fontSize: 13,
    color: colors.textSecondary,
    backgroundColor: '#EEF3F0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    gap: 8,
  },
  exerciseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3F0',
    padding: 10,
    borderRadius: 12,
  },
  exerciseNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseNumText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exerciseItemMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pdfExportBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: rounded.full,
    gap: 6,
  },
  pdfExportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarSyncBtn: {
    flex: 1,
    backgroundColor: colors.mintSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: rounded.full,
    gap: 6,
  },
  calendarSyncBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  flatPastPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pastPlanTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  smallPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.full,
    gap: 4,
  },
  smallPdfBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Payments Tab ──
  sectionSubheading: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activePlanBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  activePlanHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePlanBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activePlanPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  activePlanName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  activePlanDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 12,
  },
  dateCol: {
    flex: 1,
  },
  dateColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateColValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  familyInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  familyInfoText: {
    fontSize: 12,
    color: '#15803D',
    flex: 1,
  },
  noActivePlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  noActivePlanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  noActivePlanDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  coveredByTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coveredByTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  paymentCardAmount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  paymentCardDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateBadgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  deletePaymentBtn: {
    padding: 4,
  },
  paymentPayerText: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 6,
  },
  paymentCardNotes: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  paymentStatusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    gap: 4,
  },
  paymentStatusToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Visits Tab (Professional Timeline) ──
  flatVisitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  visitIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  visitNoteText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  checkedInBadge: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  checkedInBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginVertical: 12,
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

  // ── Modals ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  noPlansWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  noPlansWarningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  noPlansEmptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  noPlansEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6,
  },
  noPlansEmptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  goToPaymentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  goToPaymentsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planSelectorRow: {
    gap: 10,
    paddingVertical: 4,
  },
  planChoiceCard: {
    width: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  planChoiceCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  planChoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planChoiceName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  planChoiceNameActive: {
    color: colors.primary,
  },
  planChoiceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  planChoiceAmountActive: {
    color: colors.primary,
  },
  planChoiceDuration: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  planChoiceFamilyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  planChoiceFamilyText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  datesInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateHelperHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 4,
  },
  familyCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  fieldSubhint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  noFamilyMembersText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  membersCheckboxList: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 6,
  },
  familyMemberSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
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
    fontSize: 10,
    color: colors.textMuted,
  },
  payStatusToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  payStatusToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  payStatusToggleBtnPaidActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  payStatusToggleBtnUnpaidActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  payStatusToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  payStatusToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
