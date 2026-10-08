import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGymStore } from '../../store/useGymStore';
import { colors, rounded, shadows } from '../../theme/colors';
import { Member } from '../../types';
import { checkInService } from '../../database/services/checkInService';

interface MembersTabProps {
  onSelectMember: (memberId: string) => void;
  onAddMember: () => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  onSelectMember,
  onAddMember,
}) => {
  const {
    members,
    isLoadingMembers,
    searchQuery,
    statusFilter,
    selectedLocation,
    locationStats,
    setSearchQuery,
    setStatusFilter,
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

  const renderMemberItem = ({ item }: { item: Member }) => {
    const isPaid = item.latest_payment_status === 'paid';
    const isPending = item.latest_payment_status === 'pending';
    const isUnpaid = item.latest_payment_status === 'unpaid';
    const itemDisplayName = item.title && !item.name.toLowerCase().startsWith(item.title.toLowerCase())
      ? `${item.title} ${item.name}`
      : item.name;

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => onSelectMember(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarBox}>
          {item.photo_uri ? (
            <Image source={{ uri: item.photo_uri }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{itemDisplayName}</Text>
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
                    : isUnpaid
                    ? colors.dangerSoft
                    : '#F1F5F9',
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
                      : isUnpaid
                      ? colors.danger
                      : colors.textMuted,
                  },
                ]}
              >
                {isPaid ? 'Fees Paid' : isPending ? 'Due Soon' : isUnpaid ? 'Fee Unpaid' : 'No Plan'}
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

        {/* Quick Check-in Button */}
        <TouchableOpacity
          style={styles.checkInButton}
          onPress={() => handleQuickCheckIn(item)}
          activeOpacity={0.8}
          accessibilityLabel="Quick Check-in"
        >
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          <Text style={styles.checkInBtnText}>Check in</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Title & Add Member Button */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Members Directory</Text>
          <Text style={styles.subtitle}>
            {members.length} {statusFilter !== 'all' ? statusFilter : ''} members at{' '}
            {selectedLocation?.name || 'this branch'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addMemberBtn}
          onPress={onAddMember}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add" size={16} color="#FFFFFF" />
          <Text style={styles.addMemberBtnText}>Add Member</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by client name or phone..."
          placeholderTextColor="#8B9E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Row */}
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
                styles.filterText,
                statusFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Member List */}
      {isLoadingMembers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMemberItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyText}>No members found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? `No matches for "${searchQuery}"`
                  : (statusFilter !== 'all' && (locationStats?.totalMembers || 0) > 0)
                  ? `No ${statusFilter} members found.`
                  : 'Start by registering your first gym member'}
              </Text>
              {!searchQuery && (statusFilter === 'all' || (locationStats?.totalMembers || 0) === 0) && (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={onAddMember}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyAddBtnText}>Add First Member</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
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
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 9999,
    gap: 6,
    ...shadows.soft,
  },
  addMemberBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3F0',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
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
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: rounded.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.mintSoft,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 4,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  memberSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  memberTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  paymentPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  goalPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 140,
  },
  goalPillText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 9999,
    gap: 4,
    marginLeft: 8,
  },
  checkInBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 9999,
    marginTop: 18,
    gap: 8,
    ...shadows.soft,
  },
  emptyAddBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
