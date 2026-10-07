import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, rounded, shadows } from '../theme/colors';
import { memberService } from '../database/services/memberService';
import { measurementService } from '../database/services/measurementService';
import { workoutService } from '../database/services/workoutService';
import { paymentService } from '../database/services/paymentService';
import { checkInService } from '../database/services/checkInService';
import { exportWorkoutPlanPDF } from '../utils/pdfExport';
import { addWorkoutPlanToCalendar } from '../utils/calendar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  Member,
  Measurement,
  WorkoutPlan,
  Payment,
  CheckIn,
  CustomMeasurementField,
} from '../types';
import { useGymStore } from '../store/useGymStore';

type Props = NativeStackScreenProps<RootStackParamList, 'MemberProfile'>;

type TabType = 'info' | 'progress' | 'workouts' | 'payments' | 'visits';

export const MemberProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { memberId } = route.params;
  const { selectedLocation } = useGymStore();

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [member, setMember] = useState<Member | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [historicalPlans, setHistoricalPlans] = useState<WorkoutPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [customFields, setCustomFields] = useState<CustomMeasurementField[]>([]);
  const [loading, setLoading] = useState(true);

  // New Measurement Modal State
  const [showMeasModal, setShowMeasModal] = useState(false);
  const [measWeight, setMeasWeight] = useState('');
  const [measHeight, setMeasHeight] = useState('');
  const [measChest, setMeasChest] = useState('');
  const [measArms, setMeasArms] = useState('');
  const [measWaist, setMeasWaist] = useState('');
  const [measCustomValues, setMeasCustomValues] = useState<Record<string, string>>({});
  const [measNotes, setMeasNotes] = useState('');

  // New Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payPeriodLabel, setPayPeriodLabel] = useState('');
  const [payType, setPayType] = useState<'monthly' | 'yearly'>('monthly');

  // New Custom Field Modal
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('cm');

  useEffect(() => {
    loadAllMemberData();
  }, [memberId]);

  const loadAllMemberData = async () => {
    setLoading(true);
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

      // Default height from latest measurement if available
      if (measList.length > 0) {
        setMeasHeight(measList[0].height.toString());
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load member profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeasurement = async () => {
    const weightNum = parseFloat(measWeight);
    const heightNum = parseFloat(measHeight);

    if (isNaN(weightNum) || isNaN(heightNum) || weightNum <= 0 || heightNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for weight and height.');
      return;
    }

    try {
      await measurementService.addMeasurement({
        member_id: memberId,
        date: new Date().toISOString().split('T')[0],
        weight: weightNum,
        height: heightNum,
        chest: measChest ? parseFloat(measChest) : undefined,
        arms: measArms ? parseFloat(measArms) : undefined,
        waist: measWaist ? parseFloat(measWaist) : undefined,
        custom_values: measCustomValues,
        notes: measNotes.trim() || undefined,
      });

      setShowMeasModal(false);
      setMeasWeight('');
      setMeasChest('');
      setMeasArms('');
      setMeasWaist('');
      setMeasNotes('');
      setMeasCustomValues({});
      loadAllMemberData();
      Alert.alert('Saved', 'Measurement recorded with auto-calculated BMI.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record measurement');
    }
  };

  const handleCreateCustomField = async () => {
    if (!selectedLocation || !newFieldName.trim()) return;
    try {
      await measurementService.createCustomField(selectedLocation.id, newFieldName, newFieldUnit);
      setShowCustomFieldModal(false);
      setNewFieldName('');
      if (selectedLocation) {
        const updated = await measurementService.getCustomFields(selectedLocation.id);
        setCustomFields(updated);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add custom field');
    }
  };

  const handleCreatePayment = async () => {
    const amountNum = parseFloat(payAmount);
    if (!selectedLocation || isNaN(amountNum) || amountNum <= 0 || !payPeriodLabel.trim()) {
      Alert.alert('Invalid Details', 'Please provide valid amount and period label (e.g. October 2026).');
      return;
    }

    try {
      await paymentService.createPayment({
        member_id: memberId,
        location_id: selectedLocation.id,
        amount: amountNum,
        currency: 'USD',
        period_type: payType,
        period_label: payPeriodLabel.trim(),
        due_date: new Date().toISOString().split('T')[0],
        status: 'unpaid',
      });
      setShowPaymentModal(false);
      setPayAmount('');
      setPayPeriodLabel('');
      loadAllMemberData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleTogglePaymentStatus = async (payment: Payment) => {
    const nextStatus = payment.status === 'paid' ? 'unpaid' : 'paid';
    await paymentService.updateStatus(payment.id, nextStatus, 'Cash');
    loadAllMemberData();
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.memberBriefRow}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{member.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.briefName}>{member.name}</Text>
            <Text style={styles.briefContact}>{member.phone || member.email || 'No contact'}</Text>
            <View style={styles.briefPillRow}>
              <View style={styles.briefStatusPill}>
                <Text style={styles.briefStatusText}>{member.status.toUpperCase()}</Text>
              </View>
              {member.fitness_goals ? (
                <View style={styles.goalPill}>
                  <Text style={styles.goalText} numberOfLines={1}>{member.fitness_goals}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Tab Navigation Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {(
            [
              { id: 'info', label: 'Info' },
              { id: 'progress', label: 'Progress' },
              { id: 'workouts', label: 'Workouts' },
              { id: 'payments', label: 'Payments' },
              { id: 'visits', label: 'Visits' },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabItem, activeTab === t.id && styles.tabItemActive]}
              onPress={() => setActiveTab(t.id)}
            >
              <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Body */}
      <ScrollView contentContainerStyle={styles.bodyContent}>
        {/* TAB 1: INFO */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Personal Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age / Gender</Text>
                <Text style={styles.infoValue}>
                  {member.age ? `${member.age} yrs` : 'N/A'} • {member.gender || 'Not specified'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{member.dob || 'Not specified'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{member.address || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Emergency Contact</Text>
                <Text style={styles.infoValue}>{member.emergency_contact || 'None registered'}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Health & Fitness Focus</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fitness Goals</Text>
                <Text style={styles.infoValue}>{member.fitness_goals || 'General Health'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Injuries / Limitations</Text>
                <Text style={[styles.infoValue, { color: member.injuries ? colors.danger : colors.textPrimary }]}>
                  {member.injuries || 'None reported'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: PROGRESS (Time-series measurements + auto-BMI) */}
        {activeTab === 'progress' && (
          <View style={styles.tabContent}>
            <View style={styles.actionHeaderRow}>
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => setShowCustomFieldModal(true)}
              >
                <Ionicons name="options-outline" size={16} color={colors.primary} />
                <Text style={styles.actionBtnSecondaryText}>+ Custom Field</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setShowMeasModal(true)}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>New Measurement</Text>
              </TouchableOpacity>
            </View>

            {measurements.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="fitness-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No measurements recorded</Text>
                <Text style={styles.emptySubtitle}>
                  Track weight, height, BMI, chest, waist, and custom dimensions over time.
                </Text>
              </View>
            ) : (
              measurements.map((meas, idx) => (
                <View key={meas.id} style={styles.measurementCard}>
                  <View style={styles.measHeader}>
                    <Text style={styles.measDate}>📅 {meas.date}</Text>
                    <View style={styles.bmiBadge}>
                      <Text style={styles.bmiBadgeText}>BMI: {meas.bmi}</Text>
                    </View>
                  </View>

                  <View style={styles.measGrid}>
                    <View style={styles.measCol}>
                      <Text style={styles.measParamLabel}>Weight</Text>
                      <Text style={styles.measParamVal}>{meas.weight} kg</Text>
                    </View>
                    <View style={styles.measCol}>
                      <Text style={styles.measParamLabel}>Height</Text>
                      <Text style={styles.measParamVal}>{meas.height} cm</Text>
                    </View>
                    {meas.chest ? (
                      <View style={styles.measCol}>
                        <Text style={styles.measParamLabel}>Chest</Text>
                        <Text style={styles.measParamVal}>{meas.chest} cm</Text>
                      </View>
                    ) : null}
                    {meas.waist ? (
                      <View style={styles.measCol}>
                        <Text style={styles.measParamLabel}>Waist</Text>
                        <Text style={styles.measParamVal}>{meas.waist} cm</Text>
                      </View>
                    ) : null}
                    {meas.arms ? (
                      <View style={styles.measCol}>
                        <Text style={styles.measParamLabel}>Arms</Text>
                        <Text style={styles.measParamVal}>{meas.arms} cm</Text>
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
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: WORKOUT PLANS (Active & Expired) */}
        {activeTab === 'workouts' && (
          <View style={styles.tabContent}>
            <View style={styles.actionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Assigned Routines</Text>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => navigation.navigate('PlanBuilder', { memberId })}
              >
                <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>Build New Plan</Text>
              </TouchableOpacity>
            </View>

            {/* Currently Active Routine */}
            {activePlan ? (
              <View style={styles.activePlanCard}>
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

                {/* Exercises list in active plan */}
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

                {/* Action Buttons: PDF Export & Calendar Sync */}
                <View style={styles.planActionRow}>
                  <TouchableOpacity
                    style={styles.pdfExportBtn}
                    onPress={() => handleExportPDF(activePlan)}
                  >
                    <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.pdfExportBtnText}>Share / Print PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.calendarSyncBtn}
                    onPress={() => handleSyncCalendar(activePlan)}
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
                  Create a customized workout plan with target exercises, sets, and reps.
                </Text>
              </View>
            )}

            {/* Historical Workout Plans */}
            {historicalPlans.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={styles.historicalHeading}>Expired / Past Plans ({historicalPlans.length})</Text>
                {historicalPlans.map((pastPlan) => (
                  <View key={pastPlan.id} style={styles.pastPlanCard}>
                    <View style={styles.planHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pastPlanTitle}>{pastPlan.title}</Text>
                        <Text style={styles.planDates}>
                          Ended: {pastPlan.end_date} (Expired)
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.smallPdfBtn}
                        onPress={() => handleExportPDF(pastPlan)}
                      >
                        <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                        <Text style={styles.smallPdfBtnText}>PDF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 4: PAYMENTS (Monthly / Yearly dues) */}
        {activeTab === 'payments' && (
          <View style={styles.tabContent}>
            <View style={styles.actionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Billing & Dues</Text>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setShowPaymentModal(true)}
              >
                <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>Create Fee Due</Text>
              </TouchableOpacity>
            </View>

            {payments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="wallet-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No payment records</Text>
                <Text style={styles.emptySubtitle}>
                  Track monthly or annual membership payments and mark fees as paid.
                </Text>
              </View>
            ) : (
              payments.map((p) => {
                const isPaid = p.status === 'paid';
                return (
                  <View key={p.id} style={styles.paymentCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentLabel}>{p.period_label}</Text>
                      <Text style={styles.paymentAmount}>
                        ${p.amount.toFixed(2)} {p.currency} ({p.period_type})
                      </Text>
                      <Text style={styles.paymentDueText}>Due: {p.due_date}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.paymentStatusToggle,
                        { backgroundColor: isPaid ? colors.successSoft : colors.dangerSoft },
                      ]}
                      onPress={() => handleTogglePaymentStatus(p)}
                    >
                      <Ionicons
                        name={isPaid ? 'checkmark-circle' : 'close-circle'}
                        size={18}
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
                );
              })
            )}
          </View>
        )}

        {/* TAB 5: VISITS / CHECK-INS */}
        {activeTab === 'visits' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeaderTitle}>Gym Check-in History</Text>
            {checkIns.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No check-ins logged</Text>
                <Text style={styles.emptySubtitle}>
                  Check in this client from the main dashboard when they arrive.
                </Text>
              </View>
            ) : (
              checkIns.map((ci) => (
                <View key={ci.id} style={styles.checkInRow}>
                  <Ionicons name="time-outline" size={20} color={colors.accent} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.checkInTimeText}>
                      {new Date(ci.check_in_time).toLocaleString()}
                    </Text>
                    {ci.notes ? <Text style={styles.checkInNoteText}>{ci.notes}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL: Record Measurement */}
      <Modal visible={showMeasModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Body Measurement</Text>
              <TouchableOpacity onPress={() => setShowMeasModal(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.measInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Weight (kg) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="75.5"
                    keyboardType="numeric"
                    value={measWeight}
                    onChangeText={setMeasWeight}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Height (cm) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="178"
                    keyboardType="numeric"
                    value={measHeight}
                    onChangeText={setMeasHeight}
                  />
                </View>
              </View>

              <View style={styles.measInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Chest (cm)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="102"
                    keyboardType="numeric"
                    value={measChest}
                    onChangeText={setMeasChest}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Arms (cm)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="38"
                    keyboardType="numeric"
                    value={measArms}
                    onChangeText={setMeasArms}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Waist (cm)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="84"
                keyboardType="numeric"
                value={measWaist}
                onChangeText={setMeasWaist}
              />

              {/* Dynamic Trainer Custom Fields */}
              {customFields.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.primary, fontWeight: '700' }]}>
                    Custom Tracked Fields:
                  </Text>
                  {customFields.map((cf) => (
                    <View key={cf.id} style={{ marginBottom: 8 }}>
                      <Text style={styles.inputLabel}>
                        {cf.name} ({cf.unit})
                      </Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder={`Value in ${cf.unit}`}
                        keyboardType="numeric"
                        value={measCustomValues[cf.name] || ''}
                        onChangeText={(txt) =>
                          setMeasCustomValues((prev) => ({ ...prev, [cf.name]: txt }))
                        }
                      />
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, { height: 64 }]}
                placeholder="Client progress notes..."
                multiline
                value={measNotes}
                onChangeText={setMeasNotes}
              />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveMeasurement}>
                <Text style={styles.modalSubmitBtnText}>Save Measurement & Calculate BMI</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: Add Custom Measurement Field */}
      <Modal visible={showCustomFieldModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Measurement Field</Text>
              <TouchableOpacity onPress={() => setShowCustomFieldModal(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Field Name (e.g. Body Fat %, Left Thigh)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Body Fat %"
              value={newFieldName}
              onChangeText={setNewFieldName}
            />

            <Text style={styles.inputLabel}>Measurement Unit (e.g. %, cm, in)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. % or cm"
              value={newFieldUnit}
              onChangeText={setNewFieldUnit}
            />

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateCustomField}>
              <Text style={styles.modalSubmitBtnText}>Create Custom Field</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: Add Payment Due */}
      <Modal visible={showPaymentModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Fee Due</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="50"
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            <Text style={styles.inputLabel}>Period Label (e.g. November 2026, Annual 2026)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. November 2026"
              value={payPeriodLabel}
              onChangeText={setPayPeriodLabel}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
              <TouchableOpacity
                style={[styles.payTypeBtn, payType === 'monthly' && styles.payTypeBtnActive]}
                onPress={() => setPayType('monthly')}
              >
                <Text style={[styles.payTypeBtnText, payType === 'monthly' && styles.payTypeBtnTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payTypeBtn, payType === 'yearly' && styles.payTypeBtnActive]}
                onPress={() => setPayType('yearly')}
              >
                <Text style={[styles.payTypeBtnText, payType === 'yearly' && styles.payTypeBtnTextActive]}>
                  Yearly
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreatePayment}>
              <Text style={styles.modalSubmitBtnText}>Add Membership Due</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  memberBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLargeText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  briefName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  briefContact: {
    fontSize: 13,
    color: '#A7F3D0',
    marginTop: 2,
  },
  briefPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  briefStatusPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  briefStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  goalPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    maxWidth: 160,
  },
  goalText: {
    color: '#D1FAE5',
    fontSize: 10,
    fontWeight: '600',
  },
  tabScroll: {
    flexDirection: 'row',
    marginTop: 6,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.mint,
  },
  tabLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  bodyContent: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  tabContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.soft,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    gap: 6,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    backgroundColor: colors.sage,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: rounded.full,
    gap: 6,
  },
  actionBtnSecondaryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  measurementCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.soft,
  },
  measHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  measDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bmiBadge: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  bmiBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  measGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  measCol: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: rounded.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  measParamLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  measParamVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customValuesBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 8,
  },
  customPill: {
    flexDirection: 'row',
    backgroundColor: colors.sage,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    gap: 4,
  },
  customPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  customPillVal: {
    fontSize: 11,
    color: colors.textPrimary,
  },
  activePlanCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.xl,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginBottom: 16,
    ...shadows.card,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activeRoutinePill: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  activeRoutinePillText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
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
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  exerciseList: {
    marginVertical: 10,
  },
  exerciseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  exerciseNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.sage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  exerciseItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exerciseItemMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  pdfExportBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: rounded.md,
    gap: 6,
  },
  pdfExportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarSyncBtn: {
    flex: 1,
    backgroundColor: colors.sage,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: rounded.md,
    gap: 6,
  },
  calendarSyncBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  historicalHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  pastPlanCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: rounded.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pastPlanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  smallPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallPdfBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: rounded.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentAmount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentDueText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentStatusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.full,
    gap: 4,
  },
  paymentStatusToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: rounded.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  checkInTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  checkInNoteText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
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
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.surface,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  measInputRow: {
    flexDirection: 'row',
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  payTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  payTypeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  payTypeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  payTypeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
