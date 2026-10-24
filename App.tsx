import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useGymStore } from './src/store/useGymStore';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { AlertProviderWithRegistration } from './src/utils/alert';

// In web mode, eliminate default browser focus outline/border across all inputs & textareas
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rnw-input-outline-reset';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input, textarea, select, [contenteditable="true"] {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus,
      input:focus-visible, textarea:focus-visible, select:focus-visible, [contenteditable="true"]:focus-visible,
      input:active, textarea:active, select:active {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export default function App() {
  const { isInitialized, initialize } = useGymStore();

  useEffect(() => {
    // 1. Preload icon fonts silently
    Font.loadAsync(Ionicons.font).catch(() => { });

    // 2. Initialise offline SQLite database
    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <SafeAreaProvider>
        <View style={styles.splashContainer}>
          <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AlertProviderWithRegistration>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
        <AppNavigator />
      </AlertProviderWithRegistration>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#050E07',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

