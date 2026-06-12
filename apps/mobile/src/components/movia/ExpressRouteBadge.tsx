import React, { useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocale } from '../../context/LocaleContext';
import { Colors } from '../../theme/colors';
import type {
  ExpressRouteAvailability,
  ExpressRouteType,
} from '../../data/expressRoute';
import { getExpressRouteBadgeLabel } from '../../data/expressRouteDisplay';

type ExpressRouteBadgeProps = {
  type: ExpressRouteType;
  availability: ExpressRouteAvailability;
  compact?: boolean;
};

export function ExpressRouteBadge({
  type,
  availability,
  compact = false,
}: ExpressRouteBadgeProps) {
  const { t } = useLocale();
  const [detailsVisible, setDetailsVisible] = useState(false);
  const { label, dotStyle, badgeStyle, textStyle, icon } = useMemo(
    () => getBadgePresentation(type, availability, t),
    [type, availability, t],
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => setDetailsVisible(true)}
        style={[styles.badge, compact && styles.badgeCompact, badgeStyle]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {icon ? (
          <Feather name={icon} size={compact ? 11 : 12} color={Colors.textSecondary} />
        ) : (
          <View style={[styles.dot, dotStyle]} />
        )}
        <Text style={[styles.label, compact && styles.labelCompact, textStyle]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setDetailsVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('expressRoute.label')}</Text>
              <TouchableOpacity
                onPress={() => setDetailsVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.redDot]} />
              <Text style={styles.legendText}>{t('expressRoute.red')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.greenDot]} />
              <Text style={styles.legendText}>{t('expressRoute.green')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.commonDot]} />
              <Text style={styles.legendText}>{t('expressRoute.common')}</Text>
            </View>

            <Text style={styles.scheduleText}>{t('expressRoute.scheduleInfo')}</Text>
            <Text style={styles.noteText}>{t('expressRoute.operationNote')}</Text>
            <Text style={styles.linesText}>L2 · L4 · L5</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function getBadgePresentation(
  type: ExpressRouteType,
  availability: ExpressRouteAvailability,
  translate: (key: string) => string,
) {
  const isInactive = availability === 'inactive';
  const isUnknown = availability === 'unknown';

  return {
    label: getExpressRouteBadgeLabel(type, availability, translate),
    icon: isUnknown ? 'alert-circle' as const : null,
    dotStyle: [
      type === 'red' && styles.redDot,
      type === 'green' && styles.greenDot,
      type === 'common' && styles.commonDot,
    ],
    badgeStyle: [
      type === 'red' && styles.redBadge,
      type === 'green' && styles.greenBadge,
      type === 'common' && styles.commonBadge,
      isInactive && styles.inactiveBadge,
      isUnknown && styles.unknownBadge,
    ],
    textStyle: [
      isInactive && styles.inactiveText,
      isUnknown && styles.unknownText,
    ],
  };
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  labelCompact: {
    fontSize: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  redBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  greenBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
  },
  commonBadge: {
    backgroundColor: Colors.graySurface,
    borderColor: Colors.grayBorder,
  },
  inactiveBadge: {
    opacity: 0.62,
    backgroundColor: Colors.graySurface,
    borderColor: Colors.grayBorder,
  },
  unknownBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    opacity: 1,
  },
  redDot: {
    backgroundColor: '#DC2626',
  },
  greenDot: {
    backgroundColor: '#16A34A',
  },
  commonDot: {
    backgroundColor: Colors.textSecondary,
  },
  inactiveText: {
    color: Colors.textSecondary,
  },
  unknownText: {
    color: Colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
  },
  modalCard: {
    borderRadius: 18,
    backgroundColor: Colors.white,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scheduleText: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  noteText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  linesText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textTertiary,
  },
});
