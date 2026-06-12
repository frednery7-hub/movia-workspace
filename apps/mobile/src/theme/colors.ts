import type { MetroLineId } from '@movia/shared-data/metro/line-directions';

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
