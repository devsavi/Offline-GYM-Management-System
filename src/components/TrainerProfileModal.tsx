import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useGymStore } from '../store/useGymStore';
import { colors, rounded, shadows, buttonStyles } from '../theme/colors';
import { trainerService } from '../database/services/trainerService';
import { Location } from '../types';

const TOP_BAR_BG = require('../../public/top_bar.webp');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TrainerProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onLockApp?: () => void;
  onResetAllData?: () => void;
}

type ProfileCategory = 'personal' | 'location' | 'password';

const TITLE_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Coach', 'Trainer', 'Dr.'];

export const TrainerProfileModal: React.FC<TrainerProfileModalProps> = ({
  visible,
  onClose,
  onLockApp,
  onResetAllData,
}) => {
  const {
    trainer,
    locations,
    selectedLocation,
    selectLocation,
    updateTrainerProfile,
    updateTrainerPin,
    removeTrainerPin,
    createLocation,
    updateLocation,
    deleteLocation,
    lockApp,
    clearAllData,
  } = useGymStore();

  const insets = useSafeAreaInsets();

  const [activeCategory, setActiveCategory] = useState<ProfileCategory>('personal');

  // Tab switching animations (sliding underline + content crossfade & subtle slide)
  const tabAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const contentSlideAnim = useRef(new Animated.Value(0)).current;
  const [tabsContainerWidth, setTabsContainerWidth] = useState(SCREEN_WIDTH - 40);

  const tabWidth = tabsContainerWidth > 0 ? tabsContainerWidth / 3 : (SCREEN_WIDTH - 40) / 3;
  const indicatorTranslateX = tabAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
  });

  const handleSwitchTab = (category: ProfileCategory) => {
    if (category === activeCategory) return;
    const targetIndex = category === 'personal' ? 0 : category === 'location' ? 1 : 2;
    setActiveCategory(category);

    Animated.spring(tabAnim, {
      toValue: targetIndex,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();

    contentFadeAnim.setValue(0);
    contentSlideAnim.setValue(6);
    Animated.parallel([
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      const idx = activeCategory === 'personal' ? 0 : activeCategory === 'location' ? 1 : 2;
      tabAnim.setValue(idx);
      contentFadeAnim.setValue(1);
      contentSlideAnim.setValue(0);
    }
  }, [visible]);

  // Branch switcher modal overlay state (no content movement on open!)
  const [showBranchPickerModal, setShowBranchPickerModal] = useState(false);

  // --- Category 1: Personal Details ---
  const [title, setTitle] = useState(trainer?.title || 'Coach');
  const [firstName, setFirstName] = useState(trainer?.first_name || '');
  const [lastName, setLastName] = useState(trainer?.last_name || '');
  const [role, setRole] = useState(trainer?.role || '');
  const [age, setAge] = useState(trainer?.age ? String(trainer.age) : '');
  const [phone, setPhone] = useState(trainer?.phone || '');
  const [email, setEmail] = useState(trainer?.email || '');
  const [address, setAddress] = useState(trainer?.address || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(trainer?.avatar_uri || null);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Sync state when trainer changes or modal opens
  useEffect(() => {
    if (trainer) {
      setTitle(trainer.title || 'Coach');
      // Try to use stored first/last separately; fall back to splitting the full name
      if (trainer.first_name || trainer.last_name) {
        setFirstName(trainer.first_name || '');
        setLastName(trainer.last_name || '');
      } else {
        // Legacy: split name by space
        const parts = (trainer.name || '').split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
      setRole(trainer.role || '');
      setAge(trainer.age ? String(trainer.age) : '');
      setPhone(trainer.phone || '');
      setEmail(trainer.email || '');
      setAddress(trainer.address || '');
      setAvatarUri(trainer.avatar_uri || null);
    }
  }, [trainer, visible]);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to update your profile picture.');
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
    } catch (e) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleSavePersonal = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter your First Name');
      return;
    }

    const fullName = `${title ? title + ' ' : ''}${firstName.trim()} ${lastName.trim()}`.trim();

    setIsSavingPersonal(true);
    try {
      await updateTrainerProfile({
        title: title || undefined,
        name: fullName,
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        role: role.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        avatar_uri: avatarUri || undefined,
      });
      Alert.alert('Success', 'Personal profile updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update personal details');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // --- Category 2: Location Based Details ---
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');
  const [editLocDesc, setEditLocDesc] = useState('');

  const [isAddingLoc, setIsAddingLoc] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');

  const handleStartEditLocation = (loc: Location) => {
    setEditingLocId(loc.id);
    setEditLocName(loc.name);
    setEditLocAddress(loc.address || '');
    setEditLocDesc(loc.description || '');
  };

  const handleSaveEditLocation = async () => {
    if (!editingLocId || !editLocName.trim()) {
      Alert.alert('Required', 'Branch name cannot be empty');
      return;
    }
    try {
      await updateLocation(editingLocId, editLocName.trim(), editLocDesc.trim(), editLocAddress.trim());
      setEditingLocId(null);
      Alert.alert('Updated', 'Location details updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update location');
    }
  };

  const handleDeleteLocation = (id: string, branchName: string) => {
    if (locations.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one gym branch.');
      return;
    }
    Alert.alert(
      'Delete Branch',
      `Are you sure you want to delete "${branchName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLocation(id);
          },
        },
      ]
    );
  };

  const handleCreateLocation = async () => {
    if (!newLocName.trim()) {
      Alert.alert('Required', 'Branch name is required');
      return;
    }
    try {
      await createLocation(newLocName.trim(), newLocDesc.trim(), newLocAddress.trim());
      setNewLocName('');
      setNewLocAddress('');
      setNewLocDesc('');
      setIsAddingLoc(false);
      Alert.alert('Success', 'New gym branch registered.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create branch');
    }
  };

  // --- Category 3: Password / PIN Reset ---
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  const hasExistingPin = Boolean(trainer?.pin_hash);

  const handleUpdatePin = async () => {
    if (hasExistingPin) {
      if (!currentPin.trim()) {
        Alert.alert('Required', 'Please enter your current 4-digit PIN');
        return;
      }
      const isCorrect = await trainerService.verifyPin(currentPin.trim());
      if (!isCorrect) {
        Alert.alert('Security Check Failed', 'Current PIN does not match.');
        return;
      }
    }

    if (newPin.trim().length !== 4) {
      Alert.alert('Invalid PIN', 'New PIN must be exactly 4 digits.');
      return;
    }

    if (newPin !== confirmNewPin) {
      Alert.alert('Mismatch', 'New PIN and Confirm PIN do not match.');
      return;
    }

    setIsSavingPin(true);
    try {
      await updateTrainerPin(newPin.trim());
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      Alert.alert(
        'PIN Updated',
        'Your security PIN has been updated successfully. You will be asked for this PIN next time you open the app.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update PIN');
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN Protection',
      'Are you sure? Anyone opening the app will be able to access gym data without a password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove PIN',
          style: 'destructive',
          onPress: async () => {
            await removeTrainerPin();
            Alert.alert('Security Notice', 'PIN protection has been removed.');
          },
        },
      ]
    );
  };

  const handleLockNow = () => {
    onClose();
    lockApp();
    if (onLockApp) onLockApp();
  };

  const handleResetAllData = () => {
    Alert.alert(
      'Reset All App Data',
      'This will permanently delete ALL gym data including trainer profile, all members, locations, payments, and history. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await clearAllData();
            if (onResetAllData) {
              onResetAllData();
            }
          },
        },
      ]
    );
  };

  // Clean display name avoiding duplicated title prefix
  const getDisplayFullName = () => {
    const rawTitle = trainer?.title?.trim() || '';
    if (trainer?.first_name || trainer?.last_name) {
      const nameParts = [rawTitle, trainer.first_name?.trim(), trainer.last_name?.trim()].filter(Boolean);
      return nameParts.join(' ');
    }
    const rawName = trainer?.name?.trim() || 'Coach';
    if (rawTitle && rawName.toLowerCase().startsWith(rawTitle.toLowerCase())) {
      return rawName;
    }
    return rawTitle ? `${rawTitle} ${rawName}` : rawName;
  };

  const trainerDisplayName = getDisplayFullName();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screenContainer}
      >
        {/* ── TOP HERO WITH CURVED ARC (Fixed header, seamless status bar extension) ── */}
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

            {/* Top Right Close 'X' Button — aligned with status bar inset */}
            <TouchableOpacity
              style={[styles.topRightCloseBtn, { top: insets.top + 12 }]}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityLabel="Close Profile"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── WHITE AREA (No card containers - clean normal background) ── */}
          <View style={styles.whiteBody}>
            {/* Profile Avatar & Name Section */}
            <View style={styles.profileHeaderBlock}>
              {/* Tappable avatar — opens picker */}
              <TouchableOpacity
                style={styles.profileAvatarBox}
                onPress={handlePickAvatar}
                activeOpacity={0.85}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.profileAvatarImage}
                  />
                ) : (
                  <Text style={styles.profileAvatarText}>
                    {trainerDisplayName.charAt(0).toUpperCase()}
                  </Text>
                )}
                {/* Camera badge */}
                <View style={styles.profileAvatarCameraBadge}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <Text style={styles.profileNameTitle}>
                {getDisplayFullName()}
              </Text>
              <Text style={styles.profileRoleSubtitle}>
                {trainer?.role || trainer?.phone || trainer?.email || 'Head Coach & Gym Admin'}
              </Text>

              {/* Professional Location Switcher Bar (NO icons, opens overlay modal without moving content) */}
              <TouchableOpacity
                style={styles.locationSelectorCard}
                onPress={() => setShowBranchPickerModal(true)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationSelectorLabel}>ACTIVE BRANCH</Text>
                  <Text style={styles.locationSelectorValue} numberOfLines={1}>
                    {selectedLocation?.name || 'Select Branch'}
                  </Text>
                </View>
                <View style={styles.locationChangeBadge}>
                  <Text style={styles.locationChangeBadgeText}>Change</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Category Navigation Toggle Tabs with animated sliding underline */}
            <View
              style={styles.categoryTabsContainer}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) setTabsContainerWidth(w);
              }}
            >
              <TouchableOpacity
                style={styles.categoryTabItem}
                onPress={() => handleSwitchTab('personal')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    activeCategory === 'personal' && styles.categoryTabTextActive,
                  ]}
                >
                  Personal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.categoryTabItem}
                onPress={() => handleSwitchTab('location')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    activeCategory === 'location' && styles.categoryTabTextActive,
                  ]}
                >
                  Locations
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.categoryTabItem}
                onPress={() => handleSwitchTab('password')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    activeCategory === 'password' && styles.categoryTabTextActive,
                  ]}
                >
                  Security
                </Text>
              </TouchableOpacity>

              {/* Smooth Animated Sliding Indicator */}
              <Animated.View
                style={[
                  styles.categoryTabIndicator,
                  {
                    width: tabWidth,
                    transform: [{ translateX: indicatorTranslateX }],
                  },
                ]}
              />
            </View>

            {/* Tab content with animated smooth fade & subtle slide */}
            <Animated.View
              style={{
                width: '100%',
                opacity: contentFadeAnim,
                transform: [{ translateY: contentSlideAnim }],
              }}
            >
              {/* ── 1. PERSONAL DETAILS ── */}
              {activeCategory === 'personal' && (
                <View style={styles.fieldsSection}>
                  {/* Title Chips */}
                  <Text style={styles.inputLabel}>Salutation / Title</Text>
                  <View style={styles.titleChipRow}>
                    {TITLE_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.titleChip,
                          title === t && styles.titleChipActive,
                        ]}
                        onPress={() => setTitle(t)}
                      >
                        <Text
                          style={[
                            styles.titleChipText,
                            title === t && styles.titleChipTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* First Name */}
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. John"
                      placeholderTextColor={colors.textMuted}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Last Name */}
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Doe"
                      placeholderTextColor={colors.textMuted}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Role */}
                  <Text style={styles.inputLabel}>Role / Position</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Head Coach, Gym Owner"
                      placeholderTextColor={colors.textMuted}
                      value={role}
                      onChangeText={setRole}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Age */}
                  <Text style={styles.inputLabel}>Age</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 32"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={age}
                      onChangeText={setAge}
                    />
                  </View>

                  {/* Phone */}
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. +1 555-0192"
                      placeholderTextColor={colors.textMuted}
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
                      placeholder="e.g. coach@fitness.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  {/* Address */}
                  <Text style={styles.inputLabel}>Address</Text>
                  <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                    <TextInput
                      style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                      placeholder="e.g. 124 Park Ave, Suite 4B"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    style={[buttonStyles.primary, styles.actionButtonUnified]}
                    onPress={handleSavePersonal}
                    disabled={isSavingPersonal}
                    activeOpacity={0.85}
                  >
                    <Text style={buttonStyles.text}>
                      {isSavingPersonal ? 'SAVING PROFILE...' : 'SAVE CHANGES'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── 2. LOCATIONS (Professional, zero icons, normal background) ── */}
              {activeCategory === 'location' && (
                <View style={styles.fieldsSection}>
                  <Text style={styles.sectionHeading}>Registered Gym Branches ({locations.length})</Text>

                  {locations.map((loc) => {
                    const isActive = selectedLocation?.id === loc.id;
                    const isEditing = editingLocId === loc.id;

                    if (isEditing) {
                      return (
                        <View key={loc.id} style={styles.editBranchBlock}>
                          <Text style={styles.editBranchTitle}>Edit Branch: {loc.name}</Text>
                          <TextInput
                            style={styles.inlineEditInput}
                            placeholder="Branch Name *"
                            value={editLocName}
                            onChangeText={setEditLocName}
                          />
                          <TextInput
                            style={styles.inlineEditInput}
                            placeholder="Branch Address"
                            value={editLocAddress}
                            onChangeText={setEditLocAddress}
                          />
                          <TextInput
                            style={styles.inlineEditInput}
                            placeholder="Description"
                            value={editLocDesc}
                            onChangeText={setEditLocDesc}
                          />
                          <View style={styles.editBranchButtonsRow}>
                            <TouchableOpacity
                              style={[buttonStyles.secondary, { height: 42, paddingHorizontal: 16 }]}
                              onPress={() => setEditingLocId(null)}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[buttonStyles.primary, { height: 42, paddingHorizontal: 20 }]}
                              onPress={handleSaveEditLocation}
                            >
                              <Text style={buttonStyles.text}>Save</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={loc.id}
                        style={[
                          styles.branchListItem,
                          isActive && styles.branchListItemActive,
                        ]}
                        onPress={() => selectLocation(loc)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.branchNameRow}>
                            <Text
                              style={[
                                styles.branchNameText,
                                isActive && { color: colors.primary, fontWeight: '700' },
                              ]}
                            >
                              {loc.name}
                            </Text>
                            {isActive && (
                              <View style={styles.activePillBadge}>
                                <Text style={styles.activePillText}>ACTIVE</Text>
                              </View>
                            )}
                          </View>
                          {loc.address ? (
                            <Text style={styles.branchAddressText}>{loc.address}</Text>
                          ) : null}
                          <Text style={styles.branchMetaText}>
                            {loc.member_count ?? 0} members • {loc.description || 'Gym Branch'}
                          </Text>
                        </View>

                        {/* Icon Actions for Edit and Delete */}
                        <View style={styles.branchIconActionsRow}>
                          <TouchableOpacity
                            style={styles.branchIconActionBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleStartEditLocation(loc);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Edit Branch"
                          >
                            <Ionicons name="pencil-outline" size={17} color="#FFFFFF" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.branchIconActionBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteLocation(loc.id, loc.name);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Delete Branch"
                          >
                            <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Add New Branch Button */}
                  {!isAddingLoc ? (
                    <TouchableOpacity
                      style={[buttonStyles.outline, styles.actionButtonUnified, { borderColor: colors.primary }]}
                      onPress={() => setIsAddingLoc(true)}
                    >
                      <Text style={[buttonStyles.text, { color: colors.primary }]}>
                        ADD NEW GYM BRANCH
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.newBranchForm}>
                      <Text style={styles.inputLabel}>New Branch Name *</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Uptown Power Gym"
                          placeholderTextColor={colors.textMuted}
                          value={newLocName}
                          onChangeText={setNewLocName}
                        />
                      </View>

                      <Text style={styles.inputLabel}>Branch Address</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. 500 Market St, Floor 2"
                          placeholderTextColor={colors.textMuted}
                          value={newLocAddress}
                          onChangeText={setNewLocAddress}
                        />
                      </View>

                      <Text style={styles.inputLabel}>Description / Notes</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Open 6am - 10pm"
                          placeholderTextColor={colors.textMuted}
                          value={newLocDesc}
                          onChangeText={setNewLocDesc}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                        <TouchableOpacity
                          style={[buttonStyles.secondary, { flex: 1 }]}
                          onPress={() => setIsAddingLoc(false)}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[buttonStyles.primary, { flex: 1 }]}
                          onPress={handleCreateLocation}
                        >
                          <Text style={buttonStyles.text}>SAVE BRANCH</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ── 3. PASSWORD / PIN (No container card - normal background) ── */}
              {activeCategory === 'password' && (
                <View style={styles.fieldsSection}>
                  <View
                    style={[
                      styles.pinStatusBanner,
                      {
                        backgroundColor: hasExistingPin ? colors.mintSoft : '#FEF3C7',
                        borderColor: hasExistingPin ? colors.mint : '#F59E0B',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pinStatusTitle}>
                        {hasExistingPin ? 'App PIN Protection: Active' : 'No PIN Set'}
                      </Text>
                      <Text style={styles.pinStatusSubtitle}>
                        {hasExistingPin
                          ? 'App asks for this PIN upon launch.'
                          : 'Anyone who opens this app can view member data.'}
                      </Text>
                    </View>
                  </View>

                  {/* If existing PIN, require Current PIN */}
                  {hasExistingPin && (
                    <>
                      <Text style={styles.inputLabel}>Current 4-Digit PIN *</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="••••"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          secureTextEntry
                          maxLength={4}
                          value={currentPin}
                          onChangeText={setCurrentPin}
                        />
                      </View>
                    </>
                  )}

                  {/* New PIN */}
                  <Text style={styles.inputLabel}>
                    {hasExistingPin ? 'New 4-Digit PIN *' : 'Set 4-Digit PIN *'}
                  </Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                      value={newPin}
                      onChangeText={setNewPin}
                    />
                  </View>

                  {/* Confirm New PIN */}
                  <Text style={styles.inputLabel}>Confirm New 4-Digit PIN *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                      value={confirmNewPin}
                      onChangeText={setConfirmNewPin}
                    />
                  </View>

                  {/* Update PIN Button with UNIFIED BUTTON UI */}
                  <TouchableOpacity
                    style={[buttonStyles.primary, styles.actionButtonUnified]}
                    onPress={handleUpdatePin}
                    disabled={isSavingPin}
                    activeOpacity={0.85}
                  >
                    <Text style={buttonStyles.text}>
                      {isSavingPin ? 'UPDATING PIN...' : 'UPDATE SECURITY PIN'}
                    </Text>
                  </TouchableOpacity>

                  {/* Lock App Now Button */}
                  {hasExistingPin && (
                    <TouchableOpacity
                      style={[buttonStyles.secondary, styles.actionButtonUnified, { marginTop: 12 }]}
                      onPress={handleLockNow}
                      activeOpacity={0.8}
                    >
                      <Text style={[buttonStyles.text, { color: colors.primary }]}>
                        LOCK APP NOW (TEST PIN PROMPT)
                      </Text>
                    </TouchableOpacity>
                  )}

                  {hasExistingPin && (
                    <TouchableOpacity
                      style={styles.removePinBtn}
                      onPress={handleRemovePin}
                    >
                      <Text style={styles.removePinBtnText}>Disable PIN Protection</Text>
                    </TouchableOpacity>
                  )}

                  {/* ─── DANGER ZONE ─── */}
                  <View style={styles.dangerZoneBlock}>
                    <Text style={styles.dangerZoneLabel}>DANGER ZONE</Text>
                    <TouchableOpacity
                      style={[buttonStyles.danger, styles.actionButtonUnified]}
                      onPress={handleResetAllData}
                      activeOpacity={0.85}
                    >
                      <Text style={buttonStyles.text}>RESET ALL APP DATA</Text>
                    </TouchableOpacity>
                    <Text style={styles.dangerZoneCaption}>
                      Permanently deletes all members, locations, payments and profile data.
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>
        </ScrollView>

        {/* ── PROFESSIONAL LOCATION PICKER MODAL OVERLAY (Does NOT move page content) ── */}
        <Modal
          visible={showBranchPickerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBranchPickerModal(false)}
        >
          <View style={styles.branchModalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setShowBranchPickerModal(false)}
            />
            <View style={styles.branchModalCard}>
              <View style={styles.branchModalHeader}>
                <View>
                  <Text style={styles.branchModalTitle}>Select Active Branch</Text>
                  <Text style={styles.branchModalSubtitle}>Choose working gym location</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowBranchPickerModal(false)}
                  style={styles.branchModalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {locations.map((loc) => {
                  const isSelected = selectedLocation?.id === loc.id;
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={[
                        styles.branchPickerOption,
                        isSelected && styles.branchPickerOptionSelected,
                      ]}
                      onPress={async () => {
                        await selectLocation(loc);
                        setShowBranchPickerModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.branchOptionName,
                            isSelected && styles.branchOptionNameActive,
                          ]}
                        >
                          {loc.name}
                        </Text>
                        {loc.address ? (
                          <Text style={styles.branchOptionAddress}>{loc.address}</Text>
                        ) : null}
                        <Text style={styles.branchOptionMeta}>
                          {loc.member_count ?? 0} members registered
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.activeBranchTag}>
                          <Text style={styles.activeBranchTagText}>ACTIVE</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 50,
  },

  // ── HERO WITH CURVED ARC ──
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

  // Close 'X' button at TOP RIGHT
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
    zIndex: 10,
  },

  // ── WHITE AREA BELOW CURVE ──
  whiteBody: {
    paddingHorizontal: 22,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },

  profileHeaderBlock: {
    alignItems: 'center',
    marginBottom: 18,
  },
  profileAvatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    overflow: 'visible',
    ...shadows.soft,
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileAvatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileAvatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileNameTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  profileRoleSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // Professional Location Switcher Bar (NO icons, executive look)
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
  locationChangeBadge: {
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  locationChangeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // Location Modal Overlay Styles
  branchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  branchModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    ...shadows.floating,
  },
  branchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  branchModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  branchModalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  branchModalCloseBtn: {
    padding: 6,
  },
  branchPickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  branchPickerOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  branchOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  branchOptionNameActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  branchOptionAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  branchOptionMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeBranchTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBranchTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Category Toggle Tabs (matching reference image)
  categoryTabsContainer: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 20,
    marginTop: 4,
    position: 'relative',
  },
  categoryTabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabItemActive: {},
  categoryTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.1,
  },
  categoryTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  categoryTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  // ── FIELDS SECTION ──
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
  textInput: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  titleChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  titleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.full,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  titleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.mintSoft,
  },
  titleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  titleChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Unified Button styling in form
  actionButtonUnified: {
    width: '100%',
    marginTop: 20,
  },

  // Locations section items (Clean typography, NO icons)
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  branchListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 76,
    justifyContent: 'center',
    marginBottom: 10,
  },
  branchListItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  branchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
    gap: 8,
  },
  branchNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activePillBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  branchAddressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  branchMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  branchIconActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  branchIconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  editBranchBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 12,
  },
  editBranchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  inlineEditInput: {
    backgroundColor: '#EEF3F0',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  editBranchButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  newBranchForm: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },

  // Password / PIN Banner
  pinStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  pinStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pinStatusSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removePinBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  removePinBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },

  // ── DANGER ZONE ──
  dangerZoneBlock: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  dangerZoneLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  dangerZoneCaption: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
