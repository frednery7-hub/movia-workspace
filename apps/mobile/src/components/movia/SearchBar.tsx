import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocale } from '../../context/LocaleContext';
import { Colors, withAlpha } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeContext';

interface SearchBarProps {
  onMenuClick: () => void;
  onOriginClick: () => void;
  onDestinationClick: () => void;
  onSwapRoute: () => void;
  originName?: string;
  destinationName?: string;
  canSwap?: boolean;
  routeGradientColors?: [string, string];
}

export function SearchBar({
  onMenuClick,
  onOriginClick,
  onDestinationClick,
  onSwapRoute,
  originName,
  destinationName,
  canSwap = false,
  routeGradientColors = [Colors.accentPrimary, Colors.actionBlue],
}: SearchBarProps) {
  const { t } = useLocale();
  const theme = useAppTheme();
  const surfaceGradient = [
    withAlpha(routeGradientColors[0], theme.isDark ? 0.24 : 0.13),
    withAlpha(routeGradientColors[1], theme.isDark ? 0.18 : 0.09),
  ] as [string, string];

  return (
    <LinearGradient
      colors={surfaceGradient}
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onMenuClick}
        style={styles.menuButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="menu" size={20} color={theme.colors.iconMuted} />
      </TouchableOpacity>

      <View style={styles.routeFields}>
        <View style={styles.routeRail}>
          <View style={[styles.originPin, { backgroundColor: routeGradientColors[0] }]}>
            <Feather name="map-pin" size={10} color="#fff" />
          </View>
          <LinearGradient
            colors={routeGradientColors}
            style={styles.routeRailLine}
          />
          <View style={[styles.destinationDot, { backgroundColor: theme.colors.surfaceElevated, borderColor: routeGradientColors[1] }]} />
        </View>
        <View style={styles.routeCopy}>
          <TouchableOpacity style={styles.routeRow} onPress={onOriginClick} activeOpacity={0.75}>
            <Text
              style={[
                styles.routeText,
                { color: theme.colors.textPrimary },
                !originName && [styles.placeholder, { color: theme.colors.textTertiary }],
              ]}
              numberOfLines={1}
            >
              {originName ?? t('search.origin_placeholder')}
            </Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
          <TouchableOpacity style={styles.routeRow} onPress={onDestinationClick} activeOpacity={0.75}>
            <Text
              style={[
                styles.routeText,
                { color: theme.colors.textPrimary },
                !destinationName && [styles.placeholder, { color: theme.colors.textTertiary }],
              ]}
              numberOfLines={1}
            >
              {destinationName ?? t('search.destination_placeholder')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        accessibilityLabel={t('search.swap_route')}
        disabled={!canSwap}
        onPress={onSwapRoute}
        style={[
          styles.swapButton,
          { backgroundColor: theme.isDark ? '#10243E' : '#EEF6FF' },
          !canSwap && [styles.swapButtonDisabled, { backgroundColor: theme.colors.surfaceMuted }],
        ]}
        activeOpacity={0.75}
      >
        <Feather name="repeat" size={19} color={canSwap ? '#1A73E8' : '#C8CDD4'} />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 92, borderRadius: 22, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  menuButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeFields: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  routeCopy: { flex: 1 },
  routeRow: { height: 30, flexDirection: 'row', alignItems: 'center', gap: 9 },
  routeRail: {
    width: 18,
    alignItems: 'center',
    paddingVertical: 5,
  },
  routeRailLine: {
    flex: 1,
    width: 3,
    borderRadius: 2,
    marginVertical: 3,
  },
  originPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1A73E8',
    backgroundColor: '#fff',
  },
  divider: { height: 1, backgroundColor: '#EEF0F3' },
  routeText: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '700' },
  placeholder: { color: '#9CA3AF', fontWeight: '500' },
  swapButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF6FF',
  },
  swapButtonDisabled: { backgroundColor: '#F4F5F7' },
});
