import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

type StatusType = 'normal' | 'delay' | 'alert' | 'suspended';

interface StatusBadgeProps { status: StatusType; }

const config: Record<StatusType, { bg: string; color: string; label: string }> = {
  normal:    { bg: Colors.alertNormalBg,    color: Colors.alertNormalText,    label: 'Normal'   },
  delay:     { bg: Colors.alertDelayBg,     color: Colors.alertDelayText,     label: 'Atraso'   },
  alert:     { bg: Colors.alertDangerBg,    color: Colors.alertDangerText,    label: 'Alerta'   },
  suspended: { bg: Colors.alertSuspendedBg, color: Colors.alertSuspendedText, label: 'Suspenso' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status] ?? config.normal;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.color + '25' }]}>
      <Text style={[styles.text, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  text: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
});
