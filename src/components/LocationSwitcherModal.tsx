import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGymStore } from '../store/useGymStore';
import { Location } from '../types';
import { colors, rounded, shadows } from '../theme/colors';

interface LocationSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LocationSwitcherModal: React.FC<LocationSwitcherModalProps> = ({
  visible,
  onClose,
}) => {
  const { locations, selectedLocation, selectLocation, createLocation } = useGymStore();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = async (loc: Location) => {
    await selectLocation(loc);
    onClose();
  };

  const handleCreate = async () => {
    if (!newLocName.trim()) {
      Alert.alert('Required', 'Please enter a location name');
      return;
    }

    setIsSubmitting(true);
    try {
      await createLocation(newLocName.trim(), newLocDesc.trim(), newLocAddress.trim());
      setNewLocName('');
      setNewLocAddress('');
      setNewLocDesc('');
      setIsAddingNew(false);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="business" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Gym Locations</Text>
                <Text style={styles.sheetSubtitle}>
                  Switch branch or register a new one
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List of locations */}
          {!isAddingNew ? (
            <>
              <FlatList
                data={locations}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 8 }}
                renderItem={({ item }) => {
                  const isSelected = selectedLocation?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.locItem,
                        isSelected && styles.locItemSelected,
                      ]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.75}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.locNameRow}>
                          <Text
                            style={[
                              styles.locName,
                              isSelected && { color: colors.primary, fontWeight: '700' },
                            ]}
                          >
                            {item.name}
                          </Text>
                          {isSelected && (
                            <View style={styles.activeBadge}>
                              <Text style={styles.activeBadgeText}>ACTIVE</Text>
                            </View>
                          )}
                        </View>
                        {item.address ? (
                          <Text style={styles.locAddress} numberOfLines={1}>
                            📍 {item.address}
                          </Text>
                        ) : null}
                        <Text style={styles.locMembersCount}>
                          👥 {item.member_count ?? 0} members registered
                        </Text>
                      </View>

                      {isSelected ? (
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />

              <TouchableOpacity
                style={styles.addNewBtn}
                onPress={() => setIsAddingNew(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addNewBtnText}>Add New Gym Branch</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Add Branch Form */
            <View style={styles.formContainer}>
              <Text style={styles.formSectionTitle}>New Gym Branch</Text>

              <Text style={styles.inputLabel}>Branch Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Downtown Fitness Hub"
                placeholderTextColor={colors.textMuted}
                value={newLocName}
                onChangeText={setNewLocName}
                autoFocus
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 42 Main Street, City"
                placeholderTextColor={colors.textMuted}
                value={newLocAddress}
                onChangeText={setNewLocAddress}
              />

              <Text style={styles.inputLabel}>Description / Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Primary facility, opens 6am-10pm"
                placeholderTextColor={colors.textMuted}
                value={newLocDesc}
                onChangeText={setNewLocDesc}
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsAddingNew(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreate}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitBtnText}>
                    {isSubmitting ? 'Saving...' : 'Save Branch'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.xl,
    padding: 20,
    ...shadows.floating,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  locItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: rounded.md,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  locItemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  locNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  locAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  locMembersCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.mint,
    backgroundColor: colors.mintSoft,
    gap: 8,
  },
  addNewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  formContainer: {
    paddingVertical: 6,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
