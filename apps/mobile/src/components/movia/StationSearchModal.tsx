import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Modal, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStations, useStationSearch, StationResult } from '../../hooks/useStations';
import { useLocale } from '../../context/LocaleContext';
import { CacheService } from '../../config/cache.service';
import { Colors } from '../../theme/colors';
import { LineColors } from '../../theme/colors';

type StationLine = '1' | '2' | '3' | '4' | '4A' | '5' | '6';

const VALID_LINES: StationLine[] = ['1', '2', '3', '4', '4A', '5', '6'];

function toStationLine(lineId: string): StationLine | null {
  const line = lineId.replace(/^L/i, '') as StationLine;
  return VALID_LINES.includes(line) ? line : null;
}

function getStationLines(station: StationResult): StationLine[] {
  return [...new Set((station.lines ?? []).map(toStationLine).filter((line): line is StationLine => !!line))];
}

interface StationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (station: StationResult) => void;
  titleKey?: string;
}

export function StationSearchModal({
  visible, onClose, onSelect, titleKey,
}: StationSearchModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { t } = useLocale();
  const modalTitle = t(titleKey ?? 'where_to');
  const [recentStations, setRecentStations] = useState<StationResult[]>([]);

  useEffect(() => {
    if (visible) {
      CacheService.get<StationResult[]>('route_history').then(hist => {
        if (hist) setRecentStations(hist.slice(0, 5));
      });
    }
  }, [visible]);
  const { data: allStations = [], isLoading: loadingAll } = useStations();
  const { data: searchResults = [], isFetching: loadingSearch } = useStationSearch(query);
  const isLoading = loadingAll || loadingSearch;
  const filtered = useMemo(() => {
    if (!query.trim()) return allStations;
    if (query.length >= 2 && searchResults.length > 0) return searchResults;
    const q = query.toLowerCase();
    return allStations.filter(
      s => s.name.toLowerCase().includes(q) || s.shortCode.toLowerCase().includes(q),
    );
  }, [query, allStations, searchResults]);

  function handleSelect(station: StationResult) {
    setQuery('');
    onSelect(station);
  }

  function renderLineChips(station: StationResult) {
    const stationLines = getStationLines(station);
    if (stationLines.length === 0) return null;

    return (
      <View style={styles.lineChips}>
        {stationLines.map(line => (
          <View key={line} style={[styles.lineChip, { backgroundColor: LineColors[line] }]}>
            <Text style={styles.lineChipText}>L{line}</Text>
          </View>
        ))}
      </View>
    );
  }

  function withFreshStationData(station: StationResult) {
    return allStations.find(s => s.id === station.id) ?? station;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{modalTitle}</Text>
        </View>

        <View style={styles.inputWrapper}>
          <Feather name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.input}
            placeholder={t("search.placeholder")}
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.accentPrimary} />
            <Text style={styles.loadingText}>{t("search.loading")}</Text>
          </View>
        ) : (
          <>
            {!query.trim() && recentStations.length > 0 && (
              <>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t("search.recent")}</Text></View>
                {recentStations.map(station => {
                  const freshStation = withFreshStationData(station);
                  return (
                    <TouchableOpacity key={freshStation.id} style={styles.stationItem} onPress={() => handleSelect(freshStation)} activeOpacity={0.7}>
                      <Feather name="clock" size={16} color={Colors.textTertiary} />
                      <View style={styles.stationInfo}>
                        <Text style={styles.stationName}>{freshStation.name}</Text>
                        <View style={styles.stationMeta}>
                          <Text style={styles.stationCode}>{freshStation.shortCode}</Text>
                          {renderLineChips(freshStation)}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t("search.all_stations")}</Text></View>
              </>
            )}
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.stationItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.stationIcon}>
                  <Feather name="map-pin" size={14} color={Colors.accentPrimary} />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{item.name}</Text>
                  <View style={styles.stationMeta}>
                    <Text style={styles.stationCode}>{item.shortCode}</Text>
                    {renderLineChips(item)}
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={Colors.grayBorder} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t("search.empty")}</Text>
              </View>
            }
          />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.grayBorder,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.graySurface, borderRadius: 12,
  },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  stationItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  stationIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.accentPrimary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  stationInfo: { flex: 1 },
  stationName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.graySurface },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  stationCode: { fontSize: 12, color: Colors.textTertiary },
  lineChips: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lineChip: {
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineChipText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  separator: { height: 1, backgroundColor: Colors.grayBorder, marginLeft: 64 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textTertiary },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textTertiary },
});
