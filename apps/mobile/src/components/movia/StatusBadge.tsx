import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { useLocale } from '../../context/LocaleContext';

type StatusType = 'normal' | 'delay' | 'alert' | 'suspended';

interface StatusBadgeProps {
  status: StatusType;
  variant?: 'badge' | 'dot';
}

const config: Record<StatusType, { bg: string; color: string; dotColor: string; label: string }> = {
  normal:    { bg: Colors.alertNormalBg,    color: Colors.alertNormalText,    dotColor: Colors.statusGreenV2, label: '' },
  delay:     { bg: Colors.alertDelayBg,     color: Colors.alertDelayText,     dotColor: Colors.alertAmber,    label: ''          },
  alert:     { bg: Colors.alertDangerBg,    color: Colors.alertDangerText,    dotColor: '#DC2626',            label: ''           },
  suspended: { bg: Colors.alertSuspendedBg, color: Colors.alertSuspendedText, dotColor: Colors.grayText,      label: ''       },
};

export function StatusBadge({ status, variant = 'badge' }: StatusBadgeProps) {
  const { t } = useLocale();
  const labels: Record<StatusType, string> = {
    normal:    t('status.normal'),
    delay:     t('status.delay'),
    alert:     t('status.alert'),
    suspended: t('status.suspended'),
  };
  const c = config[status] ?? config.normal;
  const label = labels[status] ?? labels.normal;

  if (variant === 'dot') {
    return <View style={[styles.dot, { backgroundColor: c.dotColor }]} />;
  }

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.dotColor + '20' }]}>
      <Text style={[styles.text, { color: c.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  text: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
});
