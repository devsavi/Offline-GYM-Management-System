import React, { useState } from 'react';
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
} from 'react-native';
import { useGymStore } from '../store/useGymStore';
import { colors, rounded, shadows } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { trainer, locations, saveTrainerProfile, createLocation, selectLocation } = useGymStore();

  const isFirstTime = !trainer || locations.length === 0;

  // First-time setup state
  const [trainerName, setTrainerName] = useState('');
  const [pin, setPin] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  const handleInitialSetup = async () => {
    if (!trainerName.trim() || !locationName.trim()) {
      Alert.alert('Required Fields', 'Please enter your Trainer Name and at least one Gym Location.');
      return;
    }

    try {
      await saveTrainerProfile({
        id: `tr_${Date.now()}`,
        name: trainerName.trim(),
        pin_hash: pin.trim() || undefined,
        biometric_enabled: false,
      });

      const loc = await createLocation(locationName.trim(), 'Primary Gym Branch', locationAddress.trim());
      await selectLocation(loc);
      navigation.replace('Dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Setup failed');
    }
  };

  const handleSelectExisting = async (loc: any) => {
    await selectLocation(loc);
    navigation.replace('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <View style={styles.heroBanner}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>OFFLINE FIRST GYM ARCHITECTURE</Text>
        </View>
        <Text style={styles.title}>ApexGym Manager</Text>
        <Text style={styles.subtitle}>
          {isFirstTime
            ? 'Set up your trainer profile and primary gym location to start.'
            : 'Select your active gym branch to continue.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {isFirstTime ? (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Trainer Profile</Text>

            <Text style={styles.label}>Trainer / Owner Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex Morgan"
              placeholderTextColor={colors.textMuted}
              value={trainerName}
              onChangeText={setTrainerName}
            />

            <Text style={styles.label}>Security PIN (Optional for offline lock)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1234"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              value={pin}
              onChangeText={setPin}
            />

            <View style={styles.divider} />

            <Text style={styles.sectionHeading}>First Gym Location</Text>

            <Text style={styles.label}>Gym Location / Branch Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Downtown Athletic Club"
              placeholderTextColor={colors.textMuted}
              value={locationName}
              onChangeText={setLocationName}
            />

            <Text style={styles.label}>Address / City</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 42 Metro Blvd, Sector 5"
              placeholderTextColor={colors.textMuted}
              value={locationAddress}
              onChangeText={setLocationAddress}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleInitialSetup} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Initialize Gym System</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Choose Gym Location</Text>
            <Text style={styles.helperText}>
              All members, workout plans, and metrics will be scoped strictly to the selected location.
            </Text>

            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={styles.locationItem}
                onPress={() => handleSelectExisting(loc)}
                activeOpacity={0.7}
              >
                <View style={styles.locIconContainer}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locTitle}>{loc.name}</Text>
                  {loc.address ? <Text style={styles.locSubtitle}>{loc.address}</Text> : null}
                </View>
                <View style={styles.memberCountBadge}>
                  <Text style={styles.memberCountText}>{loc.member_count || 0} Clients</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  heroBanner: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    backgroundColor: colors.primaryDark,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textInverse,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A7F3D0',
    lineHeight: 20,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 8,
    ...shadows.soft,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceAlt,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  locIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.sage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  locTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberCountBadge: {
    backgroundColor: colors.sage,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
  },
  memberCountText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
});
