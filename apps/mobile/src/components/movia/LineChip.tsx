import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLineColor } from '../../theme/colors';

interface LineChipProps {
  line: '1' | '2' | '3' | '4' | '4A' | '5' | '6';
  variant?: 'compact' | 'expanded';
}

export function LineChip({ line, variant = 'compact' }: LineChipProps) {
  const bg = getLineColor(line);
  if (variant === 'compact') {
    return (
      <View style={[styles.compact, { backgroundColor: bg }]}>
        <Text style={styles.label}>L{line}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.expanded, { backgroundColor: bg }]}>
      <Text style={styles.label}>L{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },
  expanded: {
    height: 30, borderRadius: 15, paddingHorizontal: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },
  label: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
});
