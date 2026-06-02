export const Colors = {
  line1: '#E31837', line2: '#F26522', line3: '#FFD100',
  line4: '#00A0DF', line4a: '#00A0DF', line5: '#00A550', line6: '#9B59B6',
  farePunta: '#F26522', fareValle: '#4CAF50', fareBajo: '#2196F3',
  bgDark: '#1a1a2e', bgDark2: '#232340',
  accentPrimary: '#E31837', statusGreen: '#4CAF50',
  white: '#FFFFFF', graySurface: '#F5F5F5',
  grayText: '#9E9E9E', grayBorder: '#E0E0E0',
  textPrimary: '#1d1d1f', textSecondary: '#6B6B6B', textTertiary: '#86868B',
  alertNormalBg: '#EAF3DE', alertNormalText: '#2E7D32',
  alertDelayBg: '#FAEEDA', alertDelayText: '#E65100',
  alertDangerBg: '#FCEBEB', alertDangerText: '#C62828',
  alertSuspendedBg: '#EEEEEE', alertSuspendedText: '#616161',
} as const;

export const LineColors: Record<string, string> = {
  '1': '#E31837', '2': '#F26522', '3': '#FFD100',
  '4': '#00A0DF', '4A': '#00A0DF', '5': '#00A550', '6': '#9B59B6',
};

export const FareColors: Record<string, string> = {
  punta: '#F26522', valle: '#4CAF50', bajo: '#2196F3',
};
