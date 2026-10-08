import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGymStore } from '../../store/useGymStore';
import { measurementService } from '../../database/services/measurementService';
import { CustomMeasurementField } from '../../types';
import { colors, rounded, shadows } from '../../theme/colors';

export const LibraryTab: React.FC = () => {
  const { selectedLocation, locationStats } = useGymStore();

  const [customFields, setCustomFields] = useState<CustomMeasurementField[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [fieldUnit, setFieldUnit] = useState('cm');

  const loadFields = async () => {
    if (!selectedLocation) return;
    try {
      const fields = await measurementService.getCustomFields(selectedLocation.id);
      setCustomFields(fields);
    } catch (e) {
      console.error('Failed to load custom fields:', e);
    }
  };

  useEffect(() => {
    loadFields();
  }, [selectedLocation]);

  const handleAddField = async () => {
    if (!selectedLocation) return;
    if (!fieldName.trim()) {
      Alert.alert('Required', 'Please enter a field name');
      return;
    }
    try {
      await measurementService.createCustomField(
        selectedLocation.id,
        fieldName.trim(),
        fieldUnit.trim() || 'cm'
      );
      setFieldName('');
      setModalVisible(false);
      loadFields();
      Alert.alert('Field Created', `Added ${fieldName} to body measurements tracking.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create measurement field');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Gym Library & Tools</Text>
        <Text style={styles.subtitle}>
          Resources, measurement configurations, and workout resources
        </Text>
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Ionicons name="cash-outline" size={24} color={colors.primary} />
          <Text style={styles.overviewNumber}>
            {locationStats?.pendingPaymentsCount ?? 0}
          </Text>
          <Text style={styles.overviewLabel}>Pending Invoices</Text>
        </View>

        <View style={styles.overviewCard}>
          <Ionicons name="barbell-outline" size={24} color={colors.mint} />
          <Text style={styles.overviewNumber}>70+</Text>
          <Text style={styles.overviewLabel}>Workout Templates</Text>
        </View>

        <View style={styles.overviewCard}>
          <Ionicons name="analytics-outline" size={24} color="#3B82F6" />
          <Text style={styles.overviewNumber}>{customFields.length + 8}</Text>
          <Text style={styles.overviewLabel}>Metrics Tracked</Text>
        </View>
      </View>

      {/* Section 1: Custom Measurement Fields */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Custom Body Metrics</Text>
            <Text style={styles.cardSubtitle}>
              Configure custom measurement fields for client progress tracking
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtnSmall}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnSmallText}>Add Field</Text>
          </TouchableOpacity>
        </View>

        {/* Standard built-in metrics notice */}
        <View style={styles.builtInMetricsRow}>
          <Text style={styles.builtInTitle}>Built-in Standard Metrics:</Text>
          <Text style={styles.builtInText}>
            Weight (kg), Height (cm), BMI, Chest, Arms, Legs, Waist, Hips, Calves, Neck
          </Text>
        </View>

        {/* Custom fields list */}
        {customFields.length > 0 ? (
          <View style={styles.fieldsList}>
            {customFields.map((f) => (
              <View key={f.id} style={styles.fieldItem}>
                <Ionicons name="fitness" size={16} color={colors.primary} />
                <Text style={styles.fieldName}>{f.name}</Text>
                <Text style={styles.fieldUnit}>({f.unit})</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noFieldsText}>
            No custom fields configured yet. Tap "+ Add Field" to create fields like Body Fat %, Forearms, etc.
          </Text>
        )}
      </View>

      {/* Section 2: Workout Plan Guidelines */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Plan Templates & Guidelines</Text>
            <Text style={styles.cardSubtitle}>Preset training splits & progressive overload</Text>
          </View>
        </View>

        <View style={styles.templateList}>
          {[
            { name: 'Push / Pull / Legs (PPL)', level: 'Intermediate', days: '6 Days / Week' },
            { name: 'Upper / Lower Split', level: 'Beginner / Intermediate', days: '4 Days / Week' },
            { name: 'Full Body Conditioning', level: 'Beginner', days: '3 Days / Week' },
            { name: 'Hypertrophy Focus Split', level: 'Advanced', days: '5 Days / Week' },
          ].map((item, idx) => (
            <View key={idx} style={styles.templateCard}>
              <View style={styles.templateIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.templateName}>{item.name}</Text>
                <Text style={styles.templateMeta}>
                  {item.level} • {item.days}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={colors.mint} />
            </View>
          ))}
        </View>
      </View>

      {/* Add Custom Field Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Measurement Metric</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Metric Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Body Fat %, Forearms, Thigh"
              placeholderTextColor="#8B9E93"
              value={fieldName}
              onChangeText={setFieldName}
            />

            <Text style={styles.inputLabel}>Measurement Unit</Text>
            <View style={styles.unitRow}>
              {['cm', 'inches', '%', 'kg', 'mm'].map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitChip,
                    fieldUnit === u && styles.unitChipActive,
                  ]}
                  onPress={() => setFieldUnit(u)}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      fieldUnit === u && styles.unitChipTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddField}
              >
                <Text style={styles.saveBtnText}>Save Metric</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  overviewNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6,
  },
  overviewLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    height: 50,
    borderRadius: 9999,
    gap: 6,
    ...shadows.soft,
  },
  addBtnSmallText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  builtInMetricsRow: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: rounded.sm,
    marginBottom: 12,
  },
  builtInTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  builtInText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  fieldsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.full,
    gap: 6,
  },
  fieldName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  fieldUnit: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  noFieldsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  templateList: {
    gap: 10,
    marginTop: 4,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  templateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  templateMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.xl,
    padding: 20,
    ...shadows.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#EEF3F0',
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  unitChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.mintSoft,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF3F0',
  },
  cancelBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    height: 52,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
