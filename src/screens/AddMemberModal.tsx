import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, rounded } from '../theme/colors';
import { memberService } from '../database/services/memberService';
import { measurementService } from '../database/services/measurementService';
import { useGymStore } from '../store/useGymStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CustomMeasurementField } from '../types';

const TOP_BAR_BG = require('../../public/top_bar.webp');
const PLACEHOLDER_COLOR = '#8B9E93';
const TITLE_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Coach', 'Trainer', 'Dr.'];

type Props = NativeStackScreenProps<RootStackParamList, 'AddMember'>;

export const AddMemberModal: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { selectedLocation, refreshDashboard } = useGymStore();

  // Basic Info States
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
  const [fitnessGoals, setFitnessGoals] = useState('Muscle Building & Strength');

  // Baseline Measurement States
  const [customFields, setCustomFields] = useState<CustomMeasurementField[]>([]);
  const [measWeight, setMeasWeight] = useState('');
  const [measHeight, setMeasHeight] = useState('');
  const [measChest, setMeasChest] = useState('');
  const [measArms, setMeasArms] = useState('');
  const [measWaist, setMeasWaist] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [measNotes, setMeasNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Load custom measurement fields for current branch
  useEffect(() => {
    if (selectedLocation) {
      measurementService.getCustomFields(selectedLocation.id)
        .then((fields) => setCustomFields(fields))
        .catch((err) => console.warn('Could not load custom fields:', err));
    }
  }, [selectedLocation]);

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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter member full name.');
      return;
    }
    if (!selectedLocation) {
      Alert.alert('Error', 'No active branch selected.');
      return;
    }

    // Weight and height are optional as requested
    const weightNum = parseFloat(measWeight);
    const heightNum = parseFloat(measHeight);
    const hasAnyMeasurement =
      measWeight.trim() !== '' ||
      measHeight.trim() !== '' ||
      measChest.trim() !== '' ||
      measArms.trim() !== '' ||
      measWaist.trim() !== '' ||
      Object.keys(customValues).some((k) => customValues[k].trim() !== '');

    setIsSaving(true);
    try {
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

      // Save initial baseline measurement if provided (no required weight/height!)
      if (hasAnyMeasurement) {
        const validCustomValues: Record<string, string> = {};
        for (const [k, v] of Object.entries(customValues)) {
          if (v && v.trim()) validCustomValues[k] = v.trim();
        }

        await measurementService.addMeasurement({
          member_id: newMember.id,
          date: new Date().toISOString().split('T')[0],
          weight: !isNaN(weightNum) && weightNum > 0 ? weightNum : 0,
          height: !isNaN(heightNum) && heightNum > 0 ? heightNum : 0,
          chest: measChest ? parseFloat(measChest) : undefined,
          arms: measArms ? parseFloat(measArms) : undefined,
          waist: measWaist ? parseFloat(measWaist) : undefined,
          custom_values: Object.keys(validCustomValues).length > 0 ? validCustomValues : undefined,
          notes: measNotes.trim() || 'Initial baseline measurements on registration',
        });
      }

      await refreshDashboard();
      Alert.alert('Success', `${name} registered successfully.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not register member');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screenContainer}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cleanBody}>
          {/* Avatar Picker & Header Block */}
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

          {/* ── SECTION 1: PERSONAL DETAILS ── */}
          <View style={styles.fieldsSection}>
            <Text style={styles.sectionHeading}>Member Information</Text>

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

            {/* ── SECTION 2: INITIAL BODY MEASUREMENTS (OPTIONAL HEIGHT/WEIGHT) ── */}
            <View style={styles.measurementSectionCard}>
              <View style={styles.measHeaderRow}>
                <View style={styles.measIconBox}>
                  <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.measSectionTitle}>Initial Body Measurements</Text>
                  <Text style={styles.measSectionSubtitle}>
                    Optional: Baseline stats to calculate BMI & track progress
                  </Text>
                </View>
              </View>

              {/* Weight & Height - Optional */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 72.5"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measWeight}
                      onChangeText={setMeasWeight}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 175"
                      placeholderTextColor={PLACEHOLDER_COLOR}
                      keyboardType="numeric"
                      value={measHeight}
                      onChangeText={setMeasHeight}
                    />
                  </View>
                </View>
              </View>

              {/* Chest & Arms */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Chest (cm)</Text>
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
                  <Text style={styles.inputLabel}>Arms (cm)</Text>
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
              <Text style={styles.inputLabel}>Waist (cm)</Text>
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

              {/* Custom Tracked Fields */}
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

              {/* Measurement Notes */}
              <Text style={styles.inputLabel}>Measurement Notes</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="e.g. Measured before morning workout session"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  value={measNotes}
                  onChangeText={setMeasNotes}
                />
              </View>
            </View>

            {/* Save Member Button */}
            <TouchableOpacity
              style={styles.saveActionBtn}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveActionBtnText}>REGISTER MEMBER</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
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
  topRightCloseBtn: {
    position: 'absolute',
    right: 20,
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
  cleanBody: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Profile Header Block
  profileHeaderBlock: {
    alignItems: 'center',
    marginBottom: 20,
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
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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
  avatarHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
  },

  // Branch Info Card
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
  locationTagBadge: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  locationTagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // Fields Section
  fieldsSection: {
    width: '100%',
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

  // Row Inputs
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Measurement Card Section
  measurementSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  measHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  measIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  measSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  measSectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  customFieldsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  customFieldsHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },

  // Action Button
  saveActionBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
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
});
