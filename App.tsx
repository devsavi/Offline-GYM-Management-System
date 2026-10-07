import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useGymStore } from './src/store/useGymStore';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

export default function App() {
  const { isInitialized, initialize, errorMessage } = useGymStore();
  const [showForceEnter, setShowForceEnter] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await Font.loadAsync(Ionicons.font);
      } catch (fontErr) {
        console.warn('[Font] Ionicons preload notice:', fontErr);
      }
      await initialize();
    }
    setup();

    // Fallback: if loading takes more than 2.5s, display manual enter option
    const timer = setTimeout(() => {
      setShowForceEnter(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>OFFLINE ARCHITECTURE</Text>
        </View>
        <Text style={styles.brandTitle}>ApexGym</Text>
        <Text style={styles.brandSubtitle}>
          {errorMessage ? 'Database notice' : 'Initializing Offline Database & Engine...'}
        </Text>
        <ActivityIndicator size="large" color={colors.mint} style={{ marginTop: 24 }} />

        {errorMessage ? (
          <Text style={styles.errorText}>Notice: {errorMessage}</Text>
        ) : null}

        {showForceEnter && (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => useGymStore.setState({ isInitialized: true })}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>Continue to App →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  brandBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  brandBadgeText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#A7F3D0',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#FCA5A5',
    marginTop: 16,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  continueBtn: {
    marginTop: 28,
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
