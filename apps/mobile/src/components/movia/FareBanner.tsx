import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FareColors } from '../../theme/colors';

type FarePeriod = 'punta' | 'valle' | 'bajo';

interface FareBannerProps { period: FarePeriod; timeRange: string; }

const fareLabel: Record<FarePeriod, string> = { punta: 'Punta', valle: 'Valle', bajo: 'Bajo' };

export function FareBanner({ period, timeRange }: FareBannerProps) {
  const color = FareColors[period];
  return (
    <View style={[styles.banner, { backgroundColor: color + '0D', borderLeftColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color: '#111827' }]}>{fareLabel[period]}</Text>
      <Text style={styles.time}>{timeRange}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 40, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, borderLeftWidth: 3,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  label: { fontSize: 13, fontWeight: '600', marginRight: 8, letterSpacing: -0.1 },
  time: { fontSize: 12, color: '#6B7280' },
});
