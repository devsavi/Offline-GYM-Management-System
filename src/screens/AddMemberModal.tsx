import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, rounded, shadows } from '../theme/colors';
import { memberService } from '../database/services/memberService';
import { useGymStore } from '../store/useGymStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMember'>;

export const AddMemberModal: React.FC<Props> = ({ navigation }) => {
  const { selectedLocation, refreshDashboard } = useGymStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [injuries, setInjuries] = useState('');
  const [fitnessGoals, setFitnessGoals] = useState('Muscle Building & Strength');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter member name.');
      return;
    }
    if (!selectedLocation) {
      Alert.alert('Error', 'No location active.');
      return;
    }

    try {
      await memberService.createMember({
        location_id: selectedLocation.id,
        name: name.trim(),
        age: age ? parseInt(age) : undefined,
        gender,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        injuries: injuries.trim() || undefined,
        fitness_goals: fitnessGoals.trim() || undefined,
        status: 'active',
      });

      await refreshDashboard();
      Alert.alert('Success', `${name} registered successfully.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not register member');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register New Member</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sarah Jenkins"
            value={name}
            onChangeText={setName}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="28"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderBtnText,
                        gender === g && styles.genderBtnTextActive,
                      ]}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 019-2834"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="sarah@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Home Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Apt 4B, 12 Park Avenue"
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.label}>Emergency Contact (Name & Phone)</Text>
          <TextInput
            style={styles.input}
            placeholder="John (Spouse) - 555-0199"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
          />

          <Text style={styles.label}>Fitness Goals</Text>
          <TextInput
            style={styles.input}
            placeholder="Weight Loss, Strength, Mobility..."
            value={fitnessGoals}
            onChangeText={setFitnessGoals}
          />

          <Text style={styles.label}>Prior Injuries / Medical Conditions</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Lower back strain, right knee surgery..."
            multiline
            value={injuries}
            onChangeText={setInjuries}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Save Member to Offline Database</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.primaryDark,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 4,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
    ...shadows.soft,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
