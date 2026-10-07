import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useGymStore } from '../store/useGymStore';
import { colors, rounded, shadows } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { checkInService } from '../database/services/checkInService';
import { Member } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const {
    selectedLocation,
    members,
    isLoadingMembers,
    searchQuery,
    statusFilter,
    locationStats,
    setSearchQuery,
    setStatusFilter,
    refreshDashboard,
  } = useGymStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshDashboard();
  }, [selectedLocation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
  };

  const handleQuickCheckIn = async (member: Member) => {
    if (!selectedLocation) return;
    try {
      await checkInService.recordCheckIn(member.id, selectedLocation.id, 'Front desk check-in');
      Alert.alert('Checked In ✅', `${member.name} has been marked present for today.`);
      refreshDashboard();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not record check-in');
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    const isPaid = item.latest_payment_status === 'paid';
    const isPending = item.latest_payment_status === 'pending';

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => navigation.navigate('MemberProfile', { memberId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'active' ? colors.mintSoft : '#F1F5F9' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: item.status === 'active' ? colors.primary : colors.textMuted },
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.memberSubtitle}>
            {item.phone || item.email || 'No contact provided'}
          </Text>

          <View style={styles.memberTagsRow}>
            {/* Payment badge */}
            <View
              style={[
                styles.paymentPill,
                {
                  backgroundColor: isPaid
                    ? colors.successSoft
                    : isPending
                    ? colors.warningSoft
                    : colors.dangerSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.paymentPillText,
                  {
                    color: isPaid
                      ? colors.success
                      : isPending
                      ? colors.warning
                      : colors.danger,
                  },
                ]}
              >
                {isPaid ? 'Fees Paid' : isPending ? 'Due Soon' : 'Fee Unpaid'}
              </Text>
            </View>

            {item.fitness_goals ? (
              <View style={styles.goalPill}>
                <Text style={styles.goalPillText} numberOfLines={1}>
                  🎯 {item.fitness_goals}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quick Check-in Icon Button */}
        <TouchableOpacity
          style={styles.checkInButton}
          onPress={() => handleQuickCheckIn(item)}
          accessibilityLabel="Quick Check-in"
        >
          <Ionicons name="checkmark-circle-outline" size={24} color={colors.accent} />
          <Text style={styles.checkInBtnText}>Check-in</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Top Hero Section */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={() => navigation.navigate('Onboarding')}
          >
            <Ionicons name="business" size={16} color={colors.mint} />
            <Text style={styles.locationName} numberOfLines={1}>
              {selectedLocation?.name || 'Select Location'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.mint} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addMemberBtn}
            onPress={() => navigation.navigate('AddMember')}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.addMemberBtnText}>Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Metric KPI Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Members</Text>
            <Text style={styles.statValue}>{locationStats?.activeMembers ?? 0}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Checked In Today</Text>
            <Text style={[styles.statValue, { color: colors.mint }]}>
              {locationStats?.checkedInToday ?? 0}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Dues</Text>
            <Text style={[styles.statValue, { color: '#F87171' }]}>
              {locationStats?.pendingPaymentsCount ?? 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.bodyContent}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client name or phone..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'active', 'inactive'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                statusFilter === filter && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === filter && styles.filterPillTextActive,
                ]}
              >
                {filter === 'all' ? 'All Clients' : filter === 'active' ? 'Active Only' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Members List */}
        {isLoadingMembers && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={renderMemberItem}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={colors.border} />
                <Text style={styles.emptyTitle}>No members found</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first gym member to begin tracking workouts and progress.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: rounded.full,
    maxWidth: '58%',
    gap: 6,
  },
  locationName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addMemberBtn: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.full,
    gap: 6,
    ...shadows.soft,
  },
  addMemberBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: rounded.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  bodyContent: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: rounded.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingBottom: 24,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: rounded.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.soft,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.sage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  memberSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  paymentPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: rounded.full,
  },
  paymentPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  goalPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: rounded.full,
    maxWidth: 120,
  },
  goalPillText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  checkInButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  checkInBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
  },
});
