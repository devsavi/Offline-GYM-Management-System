export const colors = {
  // Brand Emerald & Forest Green Palette (matching visual references)
  primary: '#0A3622',          // Deep luxury forest green (hero headers & cards)
  primaryDark: '#062316',      // Darkest forest green
  primaryLight: '#0F4C3A',     // Deep emerald green
  accent: '#10B981',           // Vibrant emerald green (buttons, active pills)
  accentHover: '#059669',      // Deep emerald hover
  mint: '#34D399',             // Bright mint accent
  mintSoft: '#D1FAE5',         // Soft mint background pill
  sage: '#E6F4EA',             // Soft sage tint for badge tags & cards
  sageBorder: '#D8E2DC',       // Subtle organic border

  // Backgrounds
  background: '#F4F7F5',       // Soft organic light grey-green background
  surface: '#FFFFFF',          // Crisp pure white cards
  surfaceAlt: '#F9FBFA',       // Secondary card surface
  surfaceDark: '#122019',      // Dark contrast card
  backdrop: 'rgba(10, 54, 34, 0.4)',

  // Typography
  textPrimary: '#0F172A',      // High contrast deep charcoal
  textSecondary: '#475569',    // Neutral slate
  textMuted: '#94A3B8',        // Muted helper text
  textInverse: '#FFFFFF',      // White text on green/dark surfaces
  textAccent: '#0A3622',       // Forest green text

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#EDF2F0',
  divider: '#F1F5F9',

  // Status Colors
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',

  // Metrics & Accents
  metricGreen: '#10B981',
  metricGold: '#F59E0B',
  metricBlue: '#0284C7',
  metricPurple: '#8B5CF6',
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 30,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const rounded = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  full: 9999,
};

export const shadows = {
  soft: {
    shadowColor: '#0A3622',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    shadowColor: '#0A3622',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  floating: {
    shadowColor: '#0A3622',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const buttonStyles = {
  primary: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#0A3622',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    shadowColor: '#0A3622',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  accent: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#10B981',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  secondary: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
  },
  outline: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0A3622',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
  },
  danger: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#EF4444',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
};

// Shared pill input style — use across the entire app for consistency
export const pillInputStyle = {
  height: 50,
  backgroundColor: '#EEF3F0',
  borderRadius: 9999,
  paddingHorizontal: 20,
  fontSize: 15,
  color: '#0F172A',
  marginBottom: 12,
};

