import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGymStore } from '../../store/useGymStore';
import { colors, rounded, shadows } from '../../theme/colors';
import { Member } from '../../types';
import { checkInService } from '../../database/services/checkInService';

interface HomeTabProps {
  onNavigateTab: (tab: 'Members' | 'Exercises' | 'Library') => void;
  onAddMember: () => void;
  onSelectMember: (memberId: string) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  onNavigateTab,
  onAddMember,
  onSelectMember,
}) => {
  const {
    trainer,
    selectedLocation,
    members,
    locationStats,
    refreshDashboard,
  } = useGymStore();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
  };

  const handleQuickCheckIn = async (member: Member) => {
    if (!selectedLocation) return;
    try {
      await checkInService.recordCheckIn(member.id, selectedLocation.id, 'Checked In');
      Alert.alert('Checked In ✅', `${member.name} has been marked present for today.`);
      refreshDashboard();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not record check-in');
    }
  };

  const recentMembers = members.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Metric KPI Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIconBadge}>
            <Ionicons name="people" size={18} color={colors.primary} />
          </View>
          <Text style={styles.statLabel}>Active Members</Text>
          <Text style={styles.statValue}>{locationStats?.activeMembers ?? 0}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBadge, { backgroundColor: colors.mintSoft }]}>
            <Ionicons name="checkmark-done" size={18} color={colors.mint} />
          </View>
          <Text style={styles.statLabel}>Checked In Today</Text>
          <Text style={[styles.statValue, { color: colors.mint }]}>
            {locationStats?.checkedInToday ?? 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBadge, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
          </View>
          <Text style={styles.statLabel}>Pending Dues</Text>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {locationStats?.pendingPaymentsCount ?? 0}
          </Text>
        </View>
      </View>

      {/* Quick Action Shortcuts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#F0FDF4' }]}
          onPress={onAddMember}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="person-add" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>Add Member</Text>
          <Text style={styles.actionDesc}>Register new client</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#EFF6FF' }]}
          onPress={() => onNavigateTab('Members')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#2563EB' }]}>
            <Ionicons name="list" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>View Members</Text>
          <Text style={styles.actionDesc}>Check directory</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.actionsRow, { marginTop: 10 }]}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#FAF5FF' }]}
          onPress={() => onNavigateTab('Exercises')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#9333EA' }]}>
            <Ionicons name="barbell" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>Exercises</Text>
          <Text style={styles.actionDesc}>Movement library</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#FFFBEB' }]}
          onPress={() => onNavigateTab('Library')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#D97706' }]}>
            <Ionicons name="library" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionTitle}>Library Tools</Text>
          <Text style={styles.actionDesc}>Plans & metrics</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Members Section */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>Recent Member Activity</Text>
        </View>
        <TouchableOpacity onPress={() => onNavigateTab('Members')}>
          <Text style={styles.viewAllText}>View All ({members.length}) →</Text>
        </TouchableOpacity>
      </View>

      {recentMembers.length > 0 ? (
        recentMembers.map((item) => {
          const isPaid = item.latest_payment_status === 'paid';
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.recentMemberCard}
              onPress={() => onSelectMember(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.recentAvatar}>
                <Text style={styles.recentAvatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.recentMemberName}>{item.name}</Text>
                <Text style={styles.recentMemberMeta}>
                  {item.phone || item.email || 'No phone'} •{' '}
                  <Text style={{ color: isPaid ? colors.success : '#EF4444', fontWeight: '600' }}>
                    {isPaid ? 'Fees Paid' : 'Fee Due'}
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                style={styles.recentCheckInBtn}
                onPress={() => handleQuickCheckIn(item)}
                activeOpacity={0.8}
                accessibilityLabel="Quick Check-in"
              >
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.recentCheckInText}>Check in</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyRecentCard}>
          <Ionicons name="people-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyRecentText}>No members registered in this branch yet</Text>
          <TouchableOpacity style={styles.quickAddBtn} onPress={onAddMember}>
            <Text style={styles.quickAddBtnText}>+ Add First Member</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 28,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: rounded.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recentMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  recentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  recentMemberName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recentMemberMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recentCheckInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 9999,
    gap: 4,
    marginLeft: 8,
  },
  recentCheckInText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  emptyRecentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.md,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyRecentText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  quickAddBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  quickAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
