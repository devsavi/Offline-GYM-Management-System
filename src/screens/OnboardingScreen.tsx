import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGymStore } from '../store/useGymStore';
import { colors, rounded } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const BG_IMAGE = require('../../public/home_bg.jpg');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// Safe distance below device notification/status bar
const STATUSBAR_OFFSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 14 : 52;

// In reference image: foliage takes ~34% of screen, container covers bottom ~66%
const CONTAINER_TOP = Math.round(SCREEN_HEIGHT * 0.34);

const TITLE_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Coach', 'Trainer', 'Dr.'];

type SetupStep = 'profile' | 'pin' | 'confirm_pin' | 'locations';

interface GymLocItem {
  id: string;
  name: string;
  address: string;
}

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { trainer, locations, saveTrainerProfile, createLocation, selectLocation } = useGymStore();

  // First-time vs returning user check
  const isFirstTime = !trainer || locations.length === 0;

  // Screen View: 'hero' = full welcome bg | 'setup' = animated sheet | 'selectLocation' = returning
  const [view, setView] = useState<'hero' | 'setup' | 'selectLocation'>(
    isFirstTime ? 'hero' : 'selectLocation'
  );

  // Setup Step state
  const [currentStep, setCurrentStep] = useState<SetupStep>('profile');

  // Step 1: Personal Details
  const [title, setTitle] = useState('Coach');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');

  // Step 2: 4-digit PIN & Verification
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Step 3: Multiple Gym Locations
  const [locationsList, setLocationsList] = useState<GymLocItem[]>([]);
  const [currentLocName, setCurrentLocName] = useState('');
  const [currentLocAddress, setCurrentLocAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── ANIMATIONS ────────────────────────────────
  const containerTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(1)).current;

  // Step cross-fade / slide transition
  const stepTranslateX = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;

  // Active step progress dot animation (0 = profile, 1 = pin, 2 = locations)
  const activeStepAnim = useRef(new Animated.Value(0)).current;

  const getStepIndex = (step: SetupStep) => {
    switch (step) {
      case 'profile':
        return 0;
      case 'pin':
      case 'confirm_pin':
        return 1;
      case 'locations':
        return 2;
    }
  };

  const dot0Width = activeStepAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [24, 8, 8],
    extrapolate: 'clamp',
  });
  const dot0Color = activeStepAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [colors.primary, '#CBD5E1', '#CBD5E1'],
    extrapolate: 'clamp',
  });

  const dot1Width = activeStepAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [8, 24, 8],
    extrapolate: 'clamp',
  });
  const dot1Color = activeStepAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#CBD5E1', colors.primary, '#CBD5E1'],
    extrapolate: 'clamp',
  });

  const dot2Width = activeStepAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [8, 8, 24],
    extrapolate: 'clamp',
  });
  const dot2Color = activeStepAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#CBD5E1', '#CBD5E1', colors.primary],
    extrapolate: 'clamp',
  });

  // Shake animation for PIN mismatch
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const openSetup = () => {
    setView('setup');
    setCurrentStep('profile');
    activeStepAnim.setValue(0);
    containerTranslateY.setValue(SCREEN_HEIGHT);
    containerOpacity.setValue(0);
    heroOpacity.setValue(1);

    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(containerTranslateY, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSetup = () => {
    Animated.parallel([
      Animated.timing(containerTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setView('hero');
      setCurrentStep('profile');
      activeStepAnim.setValue(0);
    });
  };

  const transitionToStep = (nextStep: SetupStep, direction: 'forward' | 'backward' = 'forward') => {
    const enterOffset = direction === 'forward' ? 25 : -25;
    const nextIndex = getStepIndex(nextStep);

    // Animate expanding progress pill
    Animated.spring(activeStepAnim, {
      toValue: nextIndex,
      tension: 65,
      friction: 9,
      useNativeDriver: false,
    }).start();

    Animated.timing(stepOpacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(nextStep);
      stepTranslateX.setValue(enterOffset);
      Animated.parallel([
        Animated.timing(stepOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(stepTranslateX, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleBackNavigation = () => {
    if (currentStep === 'locations') {
      transitionToStep('confirm_pin', 'backward');
    } else if (currentStep === 'confirm_pin') {
      setConfirmPin('');
      setPinError(null);
      transitionToStep('pin', 'backward');
    } else if (currentStep === 'pin') {
      setPin('');
      setPinError(null);
      transitionToStep('profile', 'backward');
    } else {
      closeSetup();
    }
  };

  // ── STEP 1: SUBMIT PROFILE ───────────────────
  const handleNextFromProfile = () => {
    if (!firstName.trim()) {
      Alert.alert('Required Field', 'Please enter your First Name.');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Required Field', 'Please enter your Last Name.');
      return;
    }
    transitionToStep('pin', 'forward');
  };

  // ── STEP 2: PIN KEYPAD LOGIC ──────────────────
  const handleKeypadPress = (digit: string) => {
    setPinError(null);
    if (currentStep === 'pin') {
      if (pin.length < 4) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 4) {
          setTimeout(() => {
            transitionToStep('confirm_pin', 'forward');
          }, 180);
        }
      }
    } else if (currentStep === 'confirm_pin') {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === pin) {
            setPinError(null);
            setTimeout(() => {
              transitionToStep('locations', 'forward');
            }, 250);
          } else {
            triggerShake();
            setPinError("PINs do not match. Please re-enter.");
            setTimeout(() => {
              setConfirmPin('');
            }, 550);
          }
        }
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinError(null);
    if (currentStep === 'pin') {
      setPin((prev) => prev.slice(0, -1));
    } else if (currentStep === 'confirm_pin') {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handleSkipPin = () => {
    setPin('');
    setConfirmPin('');
    setPinError(null);
    transitionToStep('locations', 'forward');
  };

  // ── STEP 3: ADD LOCATIONS ─────────────────────
  const handleAddLocationToList = () => {
    if (!currentLocName.trim()) {
      Alert.alert('Required', 'Please enter a Location / Branch Name.');
      return;
    }
    const newLoc: GymLocItem = {
      id: `loc_temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: currentLocName.trim(),
      address: currentLocAddress.trim(),
    };
    setLocationsList((prev) => [...prev, newLoc]);
    setCurrentLocName('');
    setCurrentLocAddress('');
  };

  const handleRemoveLocation = (id: string) => {
    setLocationsList((prev) => prev.filter((loc) => loc.id !== id));
  };

  // ── COMPLETE ONBOARDING SETUP ─────────────────
  const handleCompleteSetup = async () => {
    let allLocations = [...locationsList];
    if (currentLocName.trim()) {
      allLocations.push({
        id: `loc_temp_${Date.now()}`,
        name: currentLocName.trim(),
        address: currentLocAddress.trim(),
      });
    }

    if (allLocations.length === 0) {
      Alert.alert('Location Required', 'Please add at least one Gym Location to complete setup.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullName = `${title ? title + ' ' : ''}${firstName.trim()} ${lastName.trim()}`.trim();

      // 1. Save Trainer Profile
      await saveTrainerProfile({
        id: `tr_${Date.now()}`,
        name: fullName,
        pin_hash: pin.trim() || undefined,
        biometric_enabled: false,
      });

      // 2. Create All Gym Locations
      let firstCreatedLoc = null;
      for (let i = 0; i < allLocations.length; i++) {
        const item = allLocations[i];
        const desc = i === 0 ? 'Primary Branch' : `Branch #${i + 1}`;
        const created = await createLocation(item.name, desc, item.address);
        if (i === 0) firstCreatedLoc = created;
      }

      if (firstCreatedLoc) {
        await selectLocation(firstCreatedLoc);
      }

      navigation.replace('Dashboard');
    } catch (err: any) {
      Alert.alert('Setup Error', err.message || 'Failed to complete setup');
      setIsSubmitting(false);
    }
  };

  const handleSelectExisting = async (loc: any) => {
    await selectLocation(loc);
    navigation.replace('Dashboard');
  };

  // Dynamic titles shown in the foliage area (matching Image 1 right phone)
  const getFoliageTitle = () => {
    switch (currentStep) {
      case 'profile':
        return 'Register';
      case 'pin':
        return 'Security PIN';
      case 'confirm_pin':
        return 'Verify PIN';
      case 'locations':
        return 'Gym Locations';
    }
  };

  const getFoliageSubtitle = () => {
    switch (currentStep) {
      case 'profile':
        return 'Create your new account';
      case 'pin':
        return 'Please enter 4-digit code';
      case 'confirm_pin':
        return 'Re-enter code to verify';
      case 'locations':
        return 'Set up your gym branches';
    }
  };

  // ─────────────────────────────────────────────
  // SELECT EXISTING LOCATION (returning users)
  // ─────────────────────────────────────────────
  if (view === 'selectLocation') {
    return (
      <View style={styles.heroContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Image source={BG_IMAGE} style={styles.heroBgImage} resizeMode="cover" />
        <View style={styles.heroOverlay} />

        <SafeAreaView style={styles.heroCenterBlock} pointerEvents="box-none">
          <View style={styles.titleWrapper}>
            <Text style={styles.heroAppName}>GripState</Text>
            <Text style={styles.heroTagline}>Welcome back, {trainer?.name || 'Trainer'}.</Text>
          </View>
        </SafeAreaView>

        <View style={styles.heroBottomBlock}>
          <Text style={styles.selectLocLabel}>Select your active gym location</Text>

          {locations.map((loc) => (
            <TouchableOpacity
              key={loc.id}
              style={styles.locationBtn}
              onPress={() => handleSelectExisting(loc)}
              activeOpacity={0.8}
            >
              <Ionicons name="business" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.locationBtnName}>{loc.name}</Text>
                {loc.address ? <Text style={styles.locationBtnAddr}>{loc.address}</Text> : null}
              </View>
              <View style={styles.memberCountChip}>
                <Text style={styles.memberCountText}>{loc.member_count || 0}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.heroFooterNote}>Developed by WhirlTec Solutions</Text>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────
  // HERO + ANIMATED CONTAINER (matching reference image)
  // ─────────────────────────────────────────────
  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full background foliage image */}
      <Image source={BG_IMAGE} style={styles.heroBgImage} resizeMode="cover" />
      <View style={styles.heroOverlay} />

      {/* ── HERO VIEW CONTENT (welcome screen) ── */}
      <Animated.View
        style={[styles.heroFullContent, { opacity: heroOpacity }]}
        pointerEvents={view === 'hero' ? 'auto' : 'none'}
      >
        <SafeAreaView style={styles.heroCenterBlock} pointerEvents="box-none">
          <View style={styles.titleWrapper}>
            <Text style={styles.heroAppName}>GripState</Text>
            <Text style={styles.heroTagline}>
              The professional gym{'\n'}management platform.
            </Text>
          </View>
        </SafeAreaView>

        <View style={styles.heroBottomBlock}>
          <TouchableOpacity
            style={styles.heroGetStartedBtn}
            onPress={openSetup}
            activeOpacity={0.85}
          >
            <Text style={styles.heroGetStartedText}>Get Started</Text>
          </TouchableOpacity>

          <Text style={styles.heroFooterNote}>Developed by WhirlTec Solutions</Text>
        </View>
      </Animated.View>

      {/* ── TOP FOLIAGE HEADER (Synchronized with container animation) ── */}
      {view === 'setup' && (
        <Animated.View
          style={[
            styles.foliageHeaderWrapper,
            {
              opacity: containerOpacity,
            },
          ]}
          pointerEvents={view === 'setup' ? 'auto' : 'none'}
        >
          {/* Back Button positioned safely below status bar/notification line */}
          <TouchableOpacity
            style={styles.foliageBackBtn}
            onPress={handleBackNavigation}
            activeOpacity={0.7}
            hitSlop={{ top: 18, bottom: 18, left: 18, right: 18 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Heading directly in the foliage area, cross-fades on step changes */}
          <Animated.View
            style={[styles.foliageTitleBlock, { opacity: stepOpacity }]}
            pointerEvents="none"
          >
            <Text style={styles.foliageHeaderTitle}>{getFoliageTitle()}</Text>
            <Text style={styles.foliageHeaderSubtitle}>{getFoliageSubtitle()}</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* ── ANIMATED ASYMMETRIC WHITE CONTAINER (Matching Image 1) ── */}
      {view === 'setup' && (
        <Animated.View
          style={[
            styles.animatedSheetContainer,
            {
              transform: [{ translateY: containerTranslateY }],
              opacity: containerOpacity,
            },
          ]}
        >
          {/* Step Progress Indicator - Animated Expanding Pill UI */}
          <View style={styles.stepProgressRow}>
            <Animated.View
              style={[
                styles.animatedStepDot,
                {
                  width: dot0Width,
                  backgroundColor: dot0Color,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.animatedStepDot,
                {
                  width: dot1Width,
                  backgroundColor: dot1Color,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.animatedStepDot,
                {
                  width: dot2Width,
                  backgroundColor: dot2Color,
                },
              ]}
            />
          </View>

          {/* Animated Step Content */}
          <Animated.View
            style={[
              styles.stepAnimWrapper,
              {
                opacity: stepOpacity,
                transform: [{ translateX: stepTranslateX }],
              },
            ]}
          >
            {/* ──────── STEP 1: PERSONAL DETAILS (REGISTER) ──────── */}
            {currentStep === 'profile' && (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              >
                <ScrollView
                  contentContainerStyle={styles.sheetScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Inputs Container spaced down from top */}
                  <View style={styles.formFieldsTopWrapper}>
                    {/* Title Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.titleChipRow}>
                      {TITLE_OPTIONS.map((item) => {
                        const isSelected = title === item;
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[styles.titleChip, isSelected && styles.titleChipActive]}
                            onPress={() => setTitle(item)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.titleChipText, isSelected && styles.titleChipTextActive]}>
                              {item}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Form Pill Inputs matching Image 1 */}
                    <TextInput
                      style={styles.pillInput}
                      placeholder="First Name *"
                      placeholderTextColor="#8B9E93"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />

                    <TextInput
                      style={styles.pillInput}
                      placeholder="Last Name *"
                      placeholderTextColor="#8B9E93"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />

                    <TextInput
                      style={styles.pillInput}
                      placeholder="Age (e.g. 28)"
                      placeholderTextColor="#8B9E93"
                      value={age}
                      onChangeText={setAge}
                      keyboardType="number-pad"
                      maxLength={3}
                    />

                    <TextInput
                      style={styles.pillInput}
                      placeholder="Address / City"
                      placeholderTextColor="#8B9E93"
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>

                  {/* Flexible spacer pushing the button down near bottom */}
                  <View style={{ flex: 1, minHeight: 36 }} />

                  {/* Next Button near bottom */}
                  <TouchableOpacity
                    style={styles.pillActionBtn}
                    onPress={handleNextFromProfile}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pillActionBtnText}>Next</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            )}

            {/* ──────── STEP 2: PIN SETUP (Matching Image 2) ──────── */}
            {(currentStep === 'pin' || currentStep === 'confirm_pin') && (
              <View style={styles.pinStepContainer}>
                {/* 4 Pin Indicator Circles matching Image 2 */}
                <Animated.View
                  style={[
                    styles.pinDotsRow,
                    { transform: [{ translateX: shakeAnim }] },
                  ]}
                >
                  {[0, 1, 2, 3].map((index) => {
                    const activePin = currentStep === 'pin' ? pin : confirmPin;
                    const isFilled = activePin.length > index;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.pinCircleDot,
                          isFilled && styles.pinCircleDotFilled,
                        ]}
                      />
                    );
                  })}
                </Animated.View>

                {/* PIN Error Notice */}
                {pinError ? (
                  <Text style={styles.pinErrorMessage}>{pinError}</Text>
                ) : (
                  <View style={{ height: 20 }} />
                )}

                {/* Circular Numeric Keypad matching Image 2 */}
                <View style={styles.keypadGrid}>
                  {/* Row 1 */}
                  <View style={styles.keypadRow}>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('1')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('2')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>2</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('3')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>3</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Row 2 */}
                  <View style={styles.keypadRow}>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('4')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>4</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('5')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('6')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>6</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Row 3 */}
                  <View style={styles.keypadRow}>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('7')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>7</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('8')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>8</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('9')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>9</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Row 4 */}
                  <View style={styles.keypadRow}>
                    {currentStep === 'pin' ? (
                      <TouchableOpacity style={styles.keypadAuxBtn} onPress={handleSkipPin} activeOpacity={0.65}>
                        <Text style={styles.keypadAuxText}>Skip</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.keypadAuxBtn}
                        onPress={() => {
                          setConfirmPin('');
                          setPinError(null);
                          transitionToStep('pin', 'backward');
                        }}
                        activeOpacity={0.65}
                      >
                        <Text style={styles.keypadAuxText}>Reset</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={() => handleKeypadPress('0')} activeOpacity={0.65}>
                      <Text style={styles.keypadDigitText}>0</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.keypadCircleBtn} onPress={handleKeypadBackspace} activeOpacity={0.65}>
                      <Ionicons name="backspace-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ──────── STEP 3: MULTIPLE GYM LOCATIONS ──────── */}
            {currentStep === 'locations' && (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              >
                <ScrollView
                  contentContainerStyle={styles.sheetScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formFieldsTopWrapper}>
                    {/* Added Locations Cards */}
                    {locationsList.map((item, index) => (
                      <View key={item.id} style={styles.addedLocCard}>
                        <View style={styles.addedLocIconWrap}>
                          <Ionicons name="business" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addedLocName}>{item.name}</Text>
                          {item.address ? <Text style={styles.addedLocAddr}>{item.address}</Text> : null}
                          <Text style={styles.addedLocBadge}>
                            {index === 0 ? 'Primary Branch' : `Branch #${index + 1}`}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addedLocDeleteBtn}
                          onPress={() => handleRemoveLocation(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add New Location Inputs */}
                    <View style={styles.addLocationFormCard}>
                      <Text style={styles.addLocationCardTitle}>
                        {locationsList.length === 0 ? 'Primary Gym Branch *' : 'Add Another Branch'}
                      </Text>

                      <TextInput
                        style={styles.pillInput}
                        placeholder="Branch / Gym Name *"
                        placeholderTextColor="#8B9E93"
                        value={currentLocName}
                        onChangeText={setCurrentLocName}
                      />

                      <TextInput
                        style={styles.pillInput}
                        placeholder="Branch Address / City"
                        placeholderTextColor="#8B9E93"
                        value={currentLocAddress}
                        onChangeText={setCurrentLocAddress}
                      />

                      <TouchableOpacity
                        style={styles.addAnotherBtn}
                        onPress={handleAddLocationToList}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle" size={18} color={colors.primary} />
                        <Text style={styles.addAnotherBtnText}>Add to Locations List</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Flexible spacer pushing the button down near bottom */}
                  <View style={{ flex: 1, minHeight: 36 }} />

                  {/* Complete Setup Action Button */}
                  <TouchableOpacity
                    style={[styles.pillActionBtn, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleCompleteSetup}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.pillActionBtnText}>Launch GripState</Text>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#050E07',
  },

  // ── HERO FULL ──────────────────────────────────
  heroContainer: {
    flex: 1,
    backgroundColor: '#050E07',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  heroFullContent: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCenterBlock: {
    position: 'absolute',
    top: '18%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  titleWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  heroAppName: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroTagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 10,
    lineHeight: 26,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroBottomBlock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  heroGetStartedBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: rounded.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroGetStartedText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroFooterNote: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },

  // ── SELECT LOCATION (returning users) ─────────
  selectLocLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: rounded.md,
    padding: 14,
    marginBottom: 10,
  },
  locationBtnName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationBtnAddr: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberCountChip: {
    backgroundColor: colors.sage,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  memberCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },

  // ── TOP FOLIAGE HEADER (Visible during setup) ──
  foliageHeaderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CONTAINER_TOP,
    zIndex: 9999,
    elevation: 30,
  },
  foliageBackBtn: {
    position: 'absolute',
    top: STATUSBAR_OFFSET,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  foliageTitleBlock: {
    position: 'absolute',
    top: STATUSBAR_OFFSET + 42,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  foliageHeaderTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  foliageHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // ── ANIMATED ASYMMETRICAL WHITE CONTAINER (Image 1) ──
  animatedSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: CONTAINER_TOP, // 34% from top, perfectly proportioned
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 60, // Signature asymmetrical curved swoop
    borderTopRightRadius: 0,  // Flat right shoulder matching Image 1
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
    paddingTop: 22,
  },
  stepProgressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  animatedStepDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  stepAnimWrapper: {
    flex: 1,
  },

  // ── SHEET FORM CONTENT ────────────────────────
  sheetScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 14,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  formFieldsTopWrapper: {
    marginTop: 12,
  },

  // Title Chips
  titleChipRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  titleChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: rounded.full,
    backgroundColor: '#EEF3F0',
    marginRight: 8,
  },
  titleChipActive: {
    backgroundColor: colors.primary,
  },
  titleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  titleChipTextActive: {
    color: '#FFFFFF',
  },

  // Pill Inputs (matching Image 1)
  pillInput: {
    height: 50,
    backgroundColor: '#EEF3F0',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },

  // Action Button (matching Image 1 Sign Up / Login button)
  pillActionBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10, // near bottom, but not bottom-most!
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 5,
  },
  pillActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── PIN STEP & KEYPAD (matching Image 2) ──────
  pinStepContainer: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 12,
    alignItems: 'center',
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  pinCircleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: colors.primary,
    marginHorizontal: 10,
    backgroundColor: 'transparent',
  },
  pinCircleDotFilled: {
    backgroundColor: colors.primary,
  },
  pinErrorMessage: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    height: 20,
    textAlign: 'center',
  },
  keypadGrid: {
    width: '100%',
    maxWidth: 290,
    alignSelf: 'center',
    marginTop: 2,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  keypadCircleBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 54, 34, 0.02)',
  },
  keypadDigitText: {
    fontSize: 27,
    fontWeight: '400',
    color: colors.primary,
  },
  keypadAuxBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadAuxText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // ── MULTIPLE GYM LOCATIONS STEP ───────────────
  addedLocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  addedLocIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addedLocName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addedLocAddr: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  addedLocBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 3,
  },
  addedLocDeleteBtn: {
    padding: 6,
  },
  addLocationFormCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    marginTop: 4,
  },
  addLocationCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.sage,
    marginTop: 4,
  },
  addAnotherBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
});
