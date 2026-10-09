import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

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
  { key: 'Home',      label: 'Home',      activeIcon: 'home',    inactiveIcon: 'home-outline' },
  { key: 'Members',   label: 'Members',   activeIcon: 'people',  inactiveIcon: 'people-outline' },
  { key: 'Exercises', label: 'Exercises', activeIcon: 'barbell', inactiveIcon: 'barbell-outline' },
  { key: 'Library',   label: 'Library',   activeIcon: 'library', inactiveIcon: 'library-outline' },
];

const TAB_COUNT = 4;

// Shared easing / durations — keep in sync with DashboardScreen page slide
const SLIDE_DURATION = 320;
const FADE_DURATION  = 260;
const SLIDE_EASING   = Easing.out(Easing.cubic);
const FADE_EASING    = Easing.out(Easing.quad);

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 24 : 16);

  const [rowLayout, setRowLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const pillAnim = useRef(new Animated.Value(0)).current;
  const isFirstLayout = useRef(true);

  const activeIndex = Math.max(0, TABS.findIndex((t) => t.key === activeTab));

  const tabWidth  = rowLayout.width  > 0 ? rowLayout.width  / TAB_COUNT : 0;
  const pillWidth = tabWidth > 0 ? Math.round(tabWidth * 0.88) : 0;
  const pillHeight = rowLayout.height > 0 ? Math.round(rowLayout.height - 6) : 0;

  // ── Sliding pill ──────────────────────────────────────
  useEffect(() => {
    if (tabWidth === 0) return;
    const targetX = Math.round(activeIndex * tabWidth + (tabWidth - pillWidth) / 2);

    if (isFirstLayout.current) {
      pillAnim.setValue(targetX);
      isFirstLayout.current = false;
      return;
    }

    Animated.timing(pillAnim, {
      toValue: targetX,
      duration: SLIDE_DURATION,
      easing: SLIDE_EASING,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, tabWidth, pillWidth]);

  // ── Per-tab active tween (0 inactive → 1 active) ─────
  const tabAnims = useRef(
    TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current;
  const prevIndex = useRef(activeIndex);

  useEffect(() => {
    const prev = prevIndex.current;
    if (prev === activeIndex) return;
    prevIndex.current = activeIndex;

    Animated.parallel([
      Animated.timing(tabAnims[prev], {
        toValue: 0,
        duration: FADE_DURATION,
        easing: FADE_EASING,
        useNativeDriver: false,
      }),
      Animated.timing(tabAnims[activeIndex], {
        toValue: 1,
        duration: FADE_DURATION,
        easing: FADE_EASING,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeIndex]);

  return (
    <View
      style={[styles.outerWrapper, { bottom: bottomGap }]}
      pointerEvents="box-none"
    >
      <View style={styles.floatingPill}>
        <View
          style={styles.tabsRow}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) setRowLayout({ width, height });
          }}
        >
          {/* Sliding active pill indicator */}
          {tabWidth > 0 && pillWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.slidingPill,
                {
                  width: pillWidth,
                  height: pillHeight,
                  transform: [{ translateX: pillAnim }],
                },
              ]}
            />
          )}

          {/* Tab items with animated color crossfade */}
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            const anim = tabAnims[index];

            const labelColor = anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255,255,255,0.40)', colors.mint],
            });

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => onTabChange(tab.key)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
              >
                <View style={styles.tabInner}>
                  {/* Icon — opacity crossfades via numeric anim (0→1) */}
                  <Animated.View style={{
                    opacity: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.42, 1],
                    }),
                  }}>
                    <Ionicons
                      name={isActive ? tab.activeIcon : tab.inactiveIcon}
                      size={22}
                      color={isActive ? colors.mint : 'rgba(255,255,255,0.42)'}
                    />
                  </Animated.View>

                  {/* Label — color crossfades smoothly */}
                  <Animated.Text
                    style={[styles.tabLabel, { color: labelColor }]}
                  >
                    {tab.label}
                  </Animated.Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  floatingPill: {
    width: '90%',
    maxWidth: 440,
    backgroundColor: colors.primaryDark,
    borderRadius: 36,
    paddingVertical: 7,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 25,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 52,
  },
  slidingPill: {
    position: 'absolute',
    top: 3,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
    borderWidth: 0,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: 1,
    fontWeight: '500',
  },
});
