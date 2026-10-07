import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabKey = 'Home' | 'Members' | 'Exercises' | 'Library';

interface BottomNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

interface TabItemConfig {
  key: TabKey;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItemConfig[] = [
  {
    key: 'Home',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    key: 'Members',
    label: 'Members',
    activeIcon: 'people',
    inactiveIcon: 'people-outline',
  },
  {
    key: 'Exercises',
    label: 'Exercises',
    activeIcon: 'barbell',
    inactiveIcon: 'barbell-outline',
  },
  {
    key: 'Library',
    label: 'Library',
    activeIcon: 'library',
    inactiveIcon: 'library-outline',
  },
];

const ACTIVE_BLUE = '#0D47A1'; // Deep royal blue matching reference image
const INACTIVE_COLOR = '#1E293B'; // Dark slate for inactive icons/labels

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 14) : 10;

  return (
    <View style={[styles.barContainer, { paddingBottom: bottomPadding }]}>
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.75}
            >
              {/* Active Top Blue Indicator Bar (like in image) */}
              <View
                style={[
                  styles.activeIndicator,
                  { backgroundColor: isActive ? ACTIVE_BLUE : 'transparent' },
                ]}
              />

              {/* Tab Icon */}
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.inactiveIcon}
                  size={24}
                  color={isActive ? ACTIVE_BLUE : INACTIVE_COLOR}
                />
              </View>

              {/* Tab Label */}
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? ACTIVE_BLUE : INACTIVE_COLOR,
                    fontWeight: isActive ? '700' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'stretch',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    paddingTop: 0,
  },
  activeIndicator: {
    width: 38,
    height: 3.5,
    borderRadius: 2,
    marginBottom: 6,
  },
  iconWrapper: {
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.2,
  },
});
