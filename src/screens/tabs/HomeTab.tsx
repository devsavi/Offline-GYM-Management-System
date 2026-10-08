import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGymStore } from '../../store/useGymStore';
import { colors, rounded, shadows } from '../../theme/colors';
import { Member } from '../../types';
import { checkInService } from '../../database/services/checkInService';

const QUICK_ACTION_BG = require('../../../public/quick_action.webp');

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
          <View style={styles.statIconBadge}>
            <Ionicons name="checkmark-done" size={18} color={colors.primary} />
          </View>
          <Text style={styles.statLabel}>Checked In Today</Text>
          <Text style={styles.statValue}>
            {locationStats?.checkedInToday ?? 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconBadge}>
            <Ionicons name="alert-circle" size={18} color={colors.primary} />
          </View>
          <Text style={styles.statLabel}>Pending Dues</Text>
          <Text style={styles.statValue}>
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
          style={styles.actionCard}
          onPress={onAddMember}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={QUICK_ACTION_BG}
            style={styles.actionCardBg}
            imageStyle={styles.actionCardImage}
            resizeMode="cover"
          >
            <View style={styles.actionOverlay}>
              <View style={styles.actionIconBox}>
                <Ionicons name="person-add" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle} numberOfLines={1}>Add Member</Text>
                <Text style={styles.actionDesc} numberOfLines={1}>Register new client</Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onNavigateTab('Members')}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={QUICK_ACTION_BG}
            style={styles.actionCardBg}
            imageStyle={styles.actionCardImage}
            resizeMode="cover"
          >
            <View style={styles.actionOverlay}>
              <View style={styles.actionIconBox}>
                <Ionicons name="list" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle} numberOfLines={1}>View Members</Text>
                <Text style={styles.actionDesc} numberOfLines={1}>Check directory</Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>

      <View style={[styles.actionsRow, { marginTop: 10 }]}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onNavigateTab('Exercises')}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={QUICK_ACTION_BG}
            style={styles.actionCardBg}
            imageStyle={styles.actionCardImage}
            resizeMode="cover"
          >
            <View style={styles.actionOverlay}>
              <View style={styles.actionIconBox}>
                <Ionicons name="barbell" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle} numberOfLines={1}>Exercises</Text>
                <Text style={styles.actionDesc} numberOfLines={1}>Movement library</Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => onNavigateTab('Library')}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={QUICK_ACTION_BG}
            style={styles.actionCardBg}
            imageStyle={styles.actionCardImage}
            resizeMode="cover"
          >
            <View style={styles.actionOverlay}>
              <View style={styles.actionIconBox}>
                <Ionicons name="library" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle} numberOfLines={1}>Library Tools</Text>
                <Text style={styles.actionDesc} numberOfLines={1}>Plans & metrics</Text>
              </View>
            </View>
          </ImageBackground>
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
          const isPending = item.latest_payment_status === 'pending';
          const isUnpaid = item.latest_payment_status === 'unpaid';
          const statusText = isPaid ? 'Fees Paid' : isPending ? 'Due Soon' : isUnpaid ? 'Fee Due' : 'No Plan';
          const statusColor = isPaid ? colors.success : isPending ? '#D97706' : isUnpaid ? '#EF4444' : colors.textMuted;
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
                  <Text style={{ color: statusColor, fontWeight: '600' }}>
                    {statusText}
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
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
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
    overflow: 'hidden',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionCardBg: {
    width: '100%',
    flex: 1,
  },
  actionCardImage: {
    borderRadius: rounded.lg,
  },
  actionOverlay: {
    flex: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(6, 35, 22, 0.70)',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextBox: {
    flex: 1,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionDesc: {
    fontSize: 10.5,
    color: '#FFFFFF',
    opacity: 0.85,
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
