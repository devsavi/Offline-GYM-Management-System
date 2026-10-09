import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ImageBackground,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

const TOP_BAR_BG = require('../../public/top_bar.webp');

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const TAB_ORDER: TabKey[] = ['Home', 'Members', 'Exercises', 'Library'];

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { trainer, selectedLocation, refreshDashboard, openProfileOnTab, setOpenProfileOnTab } = useGymStore();

  // Bottom Navigation state
  const [activeTab, setActiveTab] = useState<TabKey>('Home');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileInitialCategory, setProfileInitialCategory] = useState<'personal' | 'location' | 'payments' | 'password' | undefined>(undefined);

  // When another screen sets openProfileOnTab, open the modal on that tab
  useEffect(() => {
    if (openProfileOnTab) {
      setProfileInitialCategory(openProfileOnTab);
      setProfileModalVisible(true);
      setOpenProfileOnTab(null);
    }
  }, [openProfileOnTab]);

  // Horizontal page slider animation
  const pageSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    refreshDashboard();
  }, [selectedLocation]);

  // Keep page track aligned on screen resize
  useEffect(() => {
    const idx = TAB_ORDER.indexOf(activeTab);
    pageSlideAnim.setValue(-idx * SCREEN_WIDTH);
  }, [SCREEN_WIDTH]);

  const navigateTab = useCallback(
    (tab: TabKey) => {
      const targetIdx = TAB_ORDER.indexOf(tab);
      if (targetIdx === -1) return;
      setActiveTab(tab);
      Animated.timing(pageSlideAnim, {
        toValue: -targetIdx * SCREEN_WIDTH,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [SCREEN_WIDTH]
  );

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
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Header Bar */}
      <View style={styles.headerContainer}>
        <ImageBackground
          source={TOP_BAR_BG}
          style={styles.headerBg}
          resizeMode="cover"
        >
          <View style={[styles.headerOverlay, { paddingTop: insets.top + 12 }]}>
            <View style={styles.headerContent}>
              <View style={styles.brandLeft}>
                <Text style={styles.brandTitle}>GripState</Text>
                <View style={styles.brandSubtitleRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.brandSubtitle} numberOfLines={1}>
                    {selectedLocation?.name ? selectedLocation.name.toUpperCase() : 'GYM MANAGEMENT'}
                  </Text>
                </View>
              </View>

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

      {/* Horizontal Sliding Tab Screens */}
      <View style={[styles.body, { paddingBottom: 66 + Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 24 : 16) }]}>
        <Animated.View
          style={[
            styles.pagesTrack,
            {
              width: SCREEN_WIDTH * 4,
              transform: [{ translateX: pageSlideAnim }],
            },
          ]}
        >
          <View style={[styles.pageWrapper, { width: SCREEN_WIDTH }]}>
            <HomeTab
              onNavigateTab={navigateTab}
              onAddMember={() => navigation.navigate('AddMember')}
              onSelectMember={(memberId) => navigation.navigate('MemberProfile', { memberId })}
            />
          </View>

          <View style={[styles.pageWrapper, { width: SCREEN_WIDTH }]}>
            <MembersTab
              onSelectMember={(memberId) => navigation.navigate('MemberProfile', { memberId })}
              onAddMember={() => navigation.navigate('AddMember')}
            />
          </View>

          <View style={[styles.pageWrapper, { width: SCREEN_WIDTH }]}>
            <ExercisesTab />
          </View>

          <View style={[styles.pageWrapper, { width: SCREEN_WIDTH }]}>
            <LibraryTab />
          </View>
        </Animated.View>
      </View>

      {/* Floating Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={navigateTab}
      />

      {/* Trainer Profile Modal */}
      <TrainerProfileModal
        visible={profileModalVisible}
        initialCategory={profileInitialCategory}
        onClose={() => {
          setProfileModalVisible(false);
          setProfileInitialCategory(undefined);
        }}
        onResetAllData={() => {
          setProfileModalVisible(false);
          setProfileInitialCategory(undefined);
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
    backgroundColor: 'rgba(6, 35, 22, 0.70)',
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: 96,
    justifyContent: 'flex-end',
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
    overflow: 'hidden',
  },
  pagesTrack: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  pageWrapper: {
    flex: 1,
    height: '100%',
  },
});
