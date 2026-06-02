import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FareColors } from '../../theme/colors';

type FarePeriod = 'punta' | 'valle' | 'bajo';

interface FareBannerProps { period: FarePeriod; timeRange: string; }

const fareLabel: Record<FarePeriod, string> = {
  punta: 'Punta', valle: 'Valle', bajo: 'Bajo',
};
const fareIcon: Record<FarePeriod, string> = {
  punta: '\u{1F7E0}', valle: '\u{1F7E2}', bajo: '\u{1F535}',
};

export function FareBanner({ period, timeRange }: FareBannerProps) {
  const color = FareColors[period];
  return (
    <View style={[styles.banner, { backgroundColor: color + '28', borderLeftColor: color }]}>
      <Text style={styles.icon}>{fareIcon[period]}</Text>
      <Text style={[styles.label, { color }]}>{fareLabel[period]}</Text>
      <Text style={styles.time}>{timeRange}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 52, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, borderLeftWidth: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  icon: { fontSize: 11, marginRight: 8 },
  label: { fontSize: 14, fontWeight: '700', marginRight: 8, letterSpacing: -0.1 },
  time: { fontSize: 12, color: '#6B6B6B', fontWeight: '500' },
});
