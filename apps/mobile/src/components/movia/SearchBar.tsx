import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocale } from '../../context/LocaleContext';

interface SearchBarProps {
  onMenuClick: () => void;
  onOriginClick: () => void;
  onDestinationClick: () => void;
  onSwapRoute: () => void;
  originName?: string;
  destinationName?: string;
  canSwap?: boolean;
}

export function SearchBar({
  onMenuClick,
  onOriginClick,
  onDestinationClick,
  onSwapRoute,
  originName,
  destinationName,
  canSwap = false,
}: SearchBarProps) {
  const { t } = useLocale();
  return (
    <View style={styles.bar}>
      <TouchableOpacity
        onPress={onMenuClick}
        style={styles.menuButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="menu" size={20} color="#6B7280" />
      </TouchableOpacity>

      <View style={styles.routeFields}>
        <TouchableOpacity style={styles.routeRow} onPress={onOriginClick} activeOpacity={0.75}>
          <Feather name="map-pin" size={14} color="#E31837" />
          <Text
            style={[styles.routeText, !originName && styles.placeholder]}
            numberOfLines={1}
          >
            {originName ?? t('search.origin_placeholder')}
          </Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.routeRow} onPress={onDestinationClick} activeOpacity={0.75}>
          <View style={styles.destinationDot} />
          <Text
            style={[styles.routeText, !destinationName && styles.placeholder]}
            numberOfLines={1}
          >
            {destinationName ?? t('search.destination_placeholder')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityLabel={t('search.swap_route')}
        disabled={!canSwap}
        onPress={onSwapRoute}
        style={[styles.swapButton, !canSwap && styles.swapButtonDisabled]}
        activeOpacity={0.75}
      >
        <Feather name="repeat" size={19} color={canSwap ? '#1A73E8' : '#C8CDD4'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 92, borderRadius: 22, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
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
  routeFields: { flex: 1 },
  routeRow: { height: 30, flexDirection: 'row', alignItems: 'center', gap: 9 },
  destinationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#1A73E8',
    backgroundColor: '#fff',
  },
  divider: { height: 1, backgroundColor: '#EEF0F3', marginLeft: 24 },
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
