import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useGymStore } from './src/store/useGymStore';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

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
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
        <ActivityIndicator size="large" color={colors.primary} />
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
    backgroundColor: '#050E07',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

