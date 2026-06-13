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
import { useAppTheme } from '../../theme/ThemeContext';
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
  const theme = useAppTheme();
  const [detailsVisible, setDetailsVisible] = useState(false);
  const { label, badgeStyle, textStyle, icon } = useMemo(
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
          <ExpressRouteDot type={type} availability={availability} />
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
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.modalBackdrop }]}
          onPress={() => setDetailsVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surfaceElevated },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>{t('expressRoute.label')}</Text>
              <TouchableOpacity
                onPress={() => setDetailsVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.redDot]} />
              <Text style={[styles.legendText, { color: theme.colors.textPrimary }]}>{t('expressRoute.red')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, styles.greenDot]} />
              <Text style={[styles.legendText, { color: theme.colors.textPrimary }]}>{t('expressRoute.green')}</Text>
            </View>
            <View style={styles.legendRow}>
              <ExpressRouteDot type="common" availability="active" />
              <Text style={[styles.legendText, { color: theme.colors.textPrimary }]}>{t('expressRoute.common')}</Text>
            </View>

            <Text style={[styles.scheduleText, { color: theme.colors.textPrimary }]}>{t('expressRoute.scheduleInfo')}</Text>
            <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>{t('expressRoute.operationNote')}</Text>
            <Text style={[styles.linesText, { color: theme.colors.textTertiary }]}>L2 · L4 · L5</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ExpressRouteDot({ type, availability }: {
  type: ExpressRouteType;
  availability: ExpressRouteAvailability;
}) {
  const isInactive = availability === 'inactive';

  if (type === 'common') {
    return (
      <View style={[styles.dot, styles.commonDotSplit, isInactive && styles.dotInactive]}>
        <View style={styles.commonDotRedHalf} />
        <View style={styles.commonDotGreenHalf} />
      </View>
    );
  }

  return (
    <View style={[
      styles.dot,
      type === 'red' && styles.redDot,
      type === 'green' && styles.greenDot,
      isInactive && styles.dotInactive,
    ]} />
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
    overflow: 'hidden',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#D9F99D',
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
  dotInactive: {
    opacity: 0.65,
  },
  commonDotSplit: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: 'rgba(17,24,39,0.18)',
    backgroundColor: '#fff',
  },
  commonDotRedHalf: {
    flex: 1,
    backgroundColor: '#DC2626',
  },
  commonDotGreenHalf: {
    flex: 1,
    backgroundColor: '#16A34A',
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
