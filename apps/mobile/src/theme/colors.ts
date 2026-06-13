import type { MetroLineId } from '@movia/shared-data/metro/line-directions';
import { useColorScheme } from 'react-native';

export const Colors = {
  line1: '#E53935', line2: '#FBC02D', line3: '#6D4C41',
  line4: '#1E88E5', line4a: '#26C6DA', line5: '#43A047', line6: '#8E24AA',
  farePunta: '#F26522', fareValle: '#4CAF50', fareBajo: '#2196F3',
  bgDark: '#1a1a2e', bgDark2: '#232340',
  bgWarm: '#F7F5F2',
  accentPrimary: '#E53935',
  actionBlue: '#1A73E8',
  statusGreen: '#4CAF50',
  statusGreenV2: '#1E8A3C',
  alertAmber: '#F59E0B',
  white: '#FFFFFF',
  graySurface: '#F3F4F6',
  grayText: '#9CA3AF',
  grayBorder: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  alertNormalBg: '#EAF3DE', alertNormalText: '#1E8A3C',
  alertDelayBg: '#FEF3C7',  alertDelayText: '#D97706',
  alertDangerBg: '#FCEBEB', alertDangerText: '#DC2626',
  alertSuspendedBg: '#F3F4F6', alertSuspendedText: '#6B7280',
  border: '#E5E7EB',
} as const;

export type LineNumber = '1' | '2' | '3' | '4' | '4A' | '5' | '6';

export const LINE_THEME: Record<MetroLineId, { number: LineNumber; color: string }> = {
  L1: { number: '1', color: Colors.line1 },
  L2: { number: '2', color: Colors.line2 },
  L3: { number: '3', color: Colors.line3 },
  L4: { number: '4', color: Colors.line4 },
  L4A: { number: '4A', color: Colors.line4a },
  L5: { number: '5', color: Colors.line5 },
  L6: { number: '6', color: Colors.line6 },
};

export function getLineTheme(line?: string | null) {
  const lineId = normalizeLineId(line);
  return lineId ? LINE_THEME[lineId] : null;
}

export function getLineColor(line?: string | null, fallback: string = Colors.textSecondary): string {
  return getLineTheme(line)?.color ?? fallback;
}

function normalizeLineId(line?: string | null): MetroLineId | null {
  if (!line) return null;
  const prefixed = line.startsWith('L') ? line : `L${line}`;
  return prefixed in LINE_THEME ? prefixed as MetroLineId : null;
}

export const FareColors: Record<string, string> = {
  punta: '#F26522', valle: '#4CAF50', bajo: '#2196F3',
};

export type AppColorScheme = 'light' | 'dark';

export type AppTheme = {
  colorScheme: AppColorScheme;
  isDark: boolean;
  colors: {
    background: string;
    mapFallback: string;
    surface: string;
    surfaceElevated: string;
    surfaceMuted: string;
    selectedSurface: string;
    inputSurface: string;
    border: string;
    borderSubtle: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    iconMuted: string;
    shadow: string;
    dragHandle: string;
    overlayTop: string;
    overlayBottom: string;
    modalBackdrop: string;
    routeBarGradient: [string, string];
    headerGradient: [string, string];
  };
};

const APP_THEMES: Record<AppColorScheme, AppTheme> = {
  light: {
    colorScheme: 'light',
    isDark: false,
    colors: {
      background: '#F7F5F2',
      mapFallback: '#EEF2F3',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceMuted: '#F3F4F6',
      selectedSurface: '#F5FAFF',
      inputSurface: '#F3F4F6',
      border: '#E5E7EB',
      borderSubtle: 'rgba(0,0,0,0.06)',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',
      iconMuted: '#6B7280',
      shadow: '#000000',
      dragHandle: 'rgba(0,0,0,0.12)',
      overlayTop: 'rgba(240,242,245,0.4)',
      overlayBottom: 'rgba(240,242,245,0.6)',
      modalBackdrop: 'rgba(17, 24, 39, 0.42)',
      routeBarGradient: ['rgba(255,255,255,0.98)', 'rgba(248,250,252,0.96)'],
      headerGradient: ['#1a1a2e', '#232340'],
    },
  },
  dark: {
    colorScheme: 'dark',
    isDark: true,
    colors: {
      background: '#0B1020',
      mapFallback: '#111827',
      surface: '#111827',
      surfaceElevated: '#172033',
      surfaceMuted: '#1F2937',
      selectedSurface: '#10243E',
      inputSurface: '#1F2937',
      border: '#334155',
      borderSubtle: 'rgba(255,255,255,0.08)',
      textPrimary: '#F9FAFB',
      textSecondary: '#CBD5E1',
      textTertiary: '#94A3B8',
      iconMuted: '#CBD5E1',
      shadow: '#000000',
      dragHandle: 'rgba(255,255,255,0.22)',
      overlayTop: 'rgba(11,16,32,0.54)',
      overlayBottom: 'rgba(11,16,32,0.72)',
      modalBackdrop: 'rgba(2, 6, 23, 0.68)',
      routeBarGradient: ['rgba(23,32,51,0.98)', 'rgba(17,24,39,0.96)'],
      headerGradient: ['#111827', '#1F2937'],
    },
  },
};

export function getAppTheme(colorScheme: AppColorScheme): AppTheme {
  return APP_THEMES[colorScheme];
}

export function useAppTheme(): AppTheme {
  const colorScheme = useColorScheme();
  return APP_THEMES[colorScheme === 'dark' ? 'dark' : 'light'];
}
