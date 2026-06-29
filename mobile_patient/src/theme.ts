import { Platform } from 'react-native'

export const colors = {
  primary: '#0A5C6E',
  primaryLight: '#E6F4F1',
  primaryForeground: '#FFFFFF',
  secondary: '#F5A623',
  secondaryForeground: '#1A2B3C',
  success: '#27AE60',
  successForeground: '#FFFFFF',
  error: '#E74C3C',
  errorForeground: '#FFFFFF',
  info: '#3498DB',
  infoForeground: '#FFFFFF',
  background: '#FFFFFF',
  backgroundGrey: '#F8F9FA',
  foreground: '#1A2B3C',
  textPrimary: '#1A2B3C',
  textSecondary: '#6B7A8A',
  border: '#E2E8F0',
  input: '#E2E8F0',
  ring: '#0A5C6E',
  overlay: 'rgba(0, 0, 0, 0.5)',
  allergyBg: '#FFE5E5',
  allergyText: '#E74C3C',
  card: '#FFFFFF',
  muted: '#F8F9FA',
  mutedForeground: '#6B7A8A',
  accent: '#E6F4F1',
  accentForeground: '#0A5C6E',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
}

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#102A43',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  strong: Platform.select({
    ios: {
      shadowColor: '#102A43',
      shadowOpacity: 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
}

export function useThemeColors() {
  return colors
}
