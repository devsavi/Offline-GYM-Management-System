import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  useWindowDimensions,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useGymStore } from '../store/useGymStore';
import { colors } from '../theme/colors';

const BG_IMAGE = require('../../public/home_bg.webp');
// Use 'screen' (not 'window') to get full physical dimensions including status bar
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface AuthLockScreenProps {
  onUnlocked?: () => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({ onUnlocked }) => {
  const { trainer, authenticate } = useGymStore();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom + 16, 52);
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  // Shake animation for incorrect PIN
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) {
        setHasBiometrics(true);
        promptBiometrics();
      }
    } catch (e) {
      // Ignore
    }
  };

  const promptBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock GripState Gym Management',
        fallbackLabel: 'Use PIN',
      });
      if (result.success) {
        await authenticate(trainer?.pin_hash);
        if (onUnlocked) onUnlocked();
      }
    } catch (e) {
      // Biometrics failed/cancelled
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = async (digit: string) => {
    setErrorMessage(null);
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        setTimeout(async () => {
          const success = await authenticate(nextPin);
          if (success) {
            if (onUnlocked) onUnlocked();
          } else {
            triggerShake();
            setErrorMessage('Incorrect PIN. Please try again.');
            setPin('');
          }
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full background foliage image (identical to Get Started page) */}
      <Image source={BG_IMAGE} style={styles.heroBgImage} resizeMode="cover" />
      <View style={styles.heroOverlay} />

      {/* ── TITLE BLOCK — absoluteFillObject so top:'18%' = 18% of SCREEN_HEIGHT ── */}
      <View style={styles.heroFullContent} pointerEvents="box-none">
        <View style={styles.heroCenterBlock}>
          <Text style={styles.heroAppName}>GripState</Text>
          <Text style={styles.heroTagline}>
            The professional gym{'\n'}management platform.
          </Text>
        </View>
      </View>

      {/* ── SAME BOTTOM BLOCK POSITION FOR PIN UNLOCK ── */}
      <View style={[styles.heroBottomBlock, { paddingBottom: bottomPad }]}>
        {/* Welcome / PIN prompt greeting */}
        <Text style={styles.unlockWelcomeText}>
          {trainer?.name ? `Welcome back, ${trainer.name}` : 'Enter your 4-digit PIN to continue'}
        </Text>

        {/* 4 PIN Indicator Dots */}
        <Animated.View
          style={[
            styles.dotsContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isFilled ? styles.dotFilled : null,
                  errorMessage ? styles.dotError : null,
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Error message or spacing */}
        <View style={styles.errorContainer}>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <Text style={styles.placeholderText}> </Text>
          )}
        </View>

        {/* Keypad */}
        <View style={[styles.keypad, { width: Math.min(screenWidth * 0.62, 240) }]}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['bio', '0', 'back'],
          ].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((item) => {
                if (item === 'bio') {
                  if (hasBiometrics) {
                    return (
                      <TouchableOpacity
                        key={item}
                        style={styles.keypadSpecial}
                        onPress={promptBiometrics}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="finger-print" size={26} color={colors.mint} />
                      </TouchableOpacity>
                    );
                  }
                  return <View key={item} style={styles.keypadSpecial} />;
                }

                if (item === 'back') {
                  return (
                    <TouchableOpacity
                      key={item}
                      style={styles.keypadSpecial}
                      onPress={handleBackspace}
                      activeOpacity={0.7}
                      disabled={pin.length === 0}
                    >
                      <Ionicons
                        name="backspace-outline"
                        size={24}
                        color={pin.length > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'}
                      />
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.keypadButton}
                    onPress={() => handleKeyPress(item)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.keypadDigit}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Same Footer Note & Position as Get Started Page */}
        <Text style={styles.heroFooterNote}>Developed by WhirlTec Solutions</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#050E07',
    minHeight: SCREEN_HEIGHT,
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
    justifyContent: 'flex-start',
  },

  // ── TITLE BLOCK — matches OnboardingScreen heroCenterBlock exactly ──
  heroCenterBlock: {
    marginTop: Math.round(SCREEN_HEIGHT * 0.16),
    paddingHorizontal: 24,
    alignItems: 'center',
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

  // ── BOTTOM BLOCK (same position & structure) ──
  heroBottomBlock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  unlockWelcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 6,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.mint,
    borderColor: colors.mint,
    shadowColor: colors.mint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  errorContainer: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  placeholderText: {
    fontSize: 12,
  },
  keypad: {
    marginBottom: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 10,
  },
  keypadButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  keypadDigit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keypadSpecial: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroFooterNote: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
