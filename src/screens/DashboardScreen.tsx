import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGymStore } from '../store/useGymStore';
import { colors } from '../theme/colors';

// Tab screens
import { HomeTab } from './tabs/HomeTab';
import { MembersTab } from './tabs/MembersTab';
import { ExercisesTab } from './tabs/ExercisesTab';
import { LibraryTab } from './tabs/LibraryTab';

// Navigation & Modals
import { BottomNavBar, TabKey } from '../components/BottomNavBar';
import { TrainerProfileModal } from '../components/TrainerProfileModal';

const BG_IMAGE = require('../../public/home_bg.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { trainer, selectedLocation, refreshDashboard } = useGymStore();

  // Bottom Navigation state: default is 'Home'
  const [activeTab, setActiveTab] = useState<TabKey>('Home');

  // Profile modal state
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  useEffect(() => {
    refreshDashboard();
  }, [selectedLocation]);

  const getTrainerInitials = () => {
    if (trainer?.first_name || trainer?.last_name) {
      const f = trainer.first_name ? trainer.first_name.trim().charAt(0).toUpperCase() : '';
      const l = trainer.last_name ? trainer.last_name.trim().charAt(0).toUpperCase() : '';
      return `${f}${l}` || 'T';
    }
    if (trainer?.name) {
      const titleList = ['mr.', 'ms.', 'mrs.', 'coach', 'trainer', 'dr.', 'mr', 'ms', 'mrs', 'dr'];
      const rawParts = trainer.name.trim().split(/\s+/).filter(Boolean);
      const cleanParts = rawParts.filter((p) => !titleList.includes(p.toLowerCase()));
      if (cleanParts.length >= 2) {
        return `${cleanParts[0].charAt(0).toUpperCase()}${cleanParts[cleanParts.length - 1].charAt(0).toUpperCase()}`;
      }
      if (cleanParts.length === 1) {
        return cleanParts[0].slice(0, 2).toUpperCase();
      }
      return rawParts[0].charAt(0).toUpperCase();
    }
    return 'T';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Top Header Bar - With BG Image, increased height, larger texts & large profile icon */}
      <View style={styles.headerContainer}>
        <ImageBackground
          source={BG_IMAGE}
          style={styles.headerBg}
          resizeMode="cover"
        >
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              {/* Left: App Name Left-Aligned with larger typography */}
              <View style={styles.brandLeft}>
                <Text style={styles.brandTitle}>GripState</Text>
                <View style={styles.brandSubtitleRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.brandSubtitle} numberOfLines={1}>
                    {selectedLocation?.name ? selectedLocation.name.toUpperCase() : 'GYM MANAGEMENT'}
                  </Text>
                </View>
              </View>

              {/* Right: Large Clean Profile Icon Button */}
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => setProfileModalVisible(true)}
                activeOpacity={0.8}
                accessibilityLabel="Open Trainer Profile"
              >
                <View style={styles.avatarCircle}>
                  {trainer?.avatar_uri ? (
                    <Image source={{ uri: trainer.avatar_uri }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarLetter}>{getTrainerInitials()}</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Active Tab Screen Content */}
      <View style={styles.body}>
        {activeTab === 'Home' && (
          <HomeTab
            onNavigateTab={(tab) => setActiveTab(tab)}
            onAddMember={() => navigation.navigate('AddMember')}
            onSelectMember={(memberId) => navigation.navigate('MemberProfile', { memberId })}
          />
        )}

        {activeTab === 'Members' && (
          <MembersTab
            onSelectMember={(memberId) => navigation.navigate('MemberProfile', { memberId })}
            onAddMember={() => navigation.navigate('AddMember')}
          />
        )}

        {activeTab === 'Exercises' && <ExercisesTab />}

        {activeTab === 'Library' && <LibraryTab />}
      </View>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Trainer Profile Categorized Modal (with Location Switch inside) */}
      <TrainerProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        onResetAllData={() => {
          setProfileModalVisible(false);
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  headerContainer: {
    backgroundColor: colors.primaryDark,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerBg: {
    width: '100%',
  },
  headerOverlay: {
    backgroundColor: 'rgba(6, 35, 22, 0.76)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 96,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    justifyContent: 'center',
    flex: 1,
    paddingRight: 14,
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.mint,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mint,
    letterSpacing: 1.2,
  },
  profileBtn: {
    padding: 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.mintSoft,
    borderWidth: 2.5,
    borderColor: colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.mint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
