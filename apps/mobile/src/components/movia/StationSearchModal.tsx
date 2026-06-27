import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, SectionList, TouchableOpacity,
  Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NearbyStation, useStations, useStationSearch, StationResult } from '../../hooks/useStations';
import { useLocale } from '../../context/LocaleContext';
import { CacheService } from '../../config/cache.service';
import { Colors, getLineColor } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeContext';
import { getPoiById } from '../../poi/data/pois';
import type { PointOfInterest, ResolvedPoiDestination } from '../../poi/types';
import { normalizeSearchText } from '../../poi/search/normalizeSearchText';
import { normalizeStationId } from '../../poi/search/normalizeStationId';
import { resolvePoiDestination } from '../../poi/search/resolvePoiDestination';
import { searchPois } from '../../poi/search/searchPois';
import {
  formatAddressDistance,
  resolveAddressDestination,
  searchAddress,
  shouldSearchAddressQuery,
  type AddressSearchResult,
  type ResolvedAddressDestination,
} from '../../search/address/addressSearchApi';
import {
  createPlacesSessionToken,
  getPlaceDetails,
  resolvePlaceDestination,
  searchPlacesAutocomplete,
  shouldSearchPlacesQuery,
} from '../../search/places/placesSearchApi';
import { ConsentService } from '../../privacy/consent.service';
import type {
  PlaceAutocompleteResult,
  ResolvedPlaceDestination,
} from '../../search/places/placesSearchTypes';
import {
  getExpressRouteState,
  getVisibleExpressRouteState,
  type ExpressRouteState,
} from '../../data/expressRoute';
import { ExpressRouteBadge } from './ExpressRouteBadge';

type StationLine = '1' | '2' | '3' | '4' | '4A' | '5' | '6';

const VALID_LINES: StationLine[] = ['1', '2', '3', '4', '4A', '5', '6'];

type SearchSectionType = 'recent' | 'stations' | 'places' | 'pois';

type SearchResultItem =
  | { kind: 'recent'; id: string; rankScore: number; item: SearchHistoryItem }
  | { kind: 'station'; id: string; rankScore: number; station: StationResult; distanceMeters?: number; isNearby?: boolean }
  | { kind: 'place'; id: string; rankScore: number; place: PlaceAutocompleteResult }
  | { kind: 'address'; id: string; rankScore: number; address: AddressSearchResult }
  | { kind: 'poi'; id: string; rankScore: number; poi: PointOfInterest };

type SearchSection = {
  title: string;
  type: SearchSectionType;
  data: SearchResultItem[];
  isLoading?: boolean;
};

export type StationSearchSelectionOptions = {
  poiDestination?: ResolvedPoiDestination;
  addressDestination?: ResolvedAddressDestination;
  placeDestination?: ResolvedPlaceDestination;
};

export type SearchHistoryItem = StationResult & {
  itemType?: 'station' | 'poi' | 'address' | 'place';
  displayName?: string;
  poiId?: string;
  addressId?: string;
  placeId?: string;
  routeStationName?: string;
  routeLineIds?: string[];
  routeDistanceMeters?: number;
  timestamp?: number;
};

function toStationLine(lineId: string): StationLine | null {
  const line = lineId.replace(/^L/i, '') as StationLine;
  return VALID_LINES.includes(line) ? line : null;
}

function getStationLines(station: StationResult): StationLine[] {
  return [...new Set((station.lines ?? []).map(toStationLine).filter((line): line is StationLine => !!line))];
}

function toStationLines(lineIds: string[]): StationLine[] {
  return [...new Set(lineIds.map(toStationLine).filter((line): line is StationLine => !!line))];
}

function getHistoryKey(item: SearchHistoryItem): string {
  if (item.itemType === 'address' && item.addressId) return `address:${item.addressId}`;
  if (item.itemType === 'place' && item.placeId) return `place:${item.placeId}`;
  return item.itemType === 'poi' && item.poiId ? `poi:${item.poiId}` : `station:${item.id}`;
}

function getPrimaryPoiStation(poi: PointOfInterest) {
  return poi.recommendedStations.find(station => station.isPrimary) ?? poi.recommendedStations[0];
}

function formatLineIds(lineIds: string[]): string {
  return lineIds.map(lineId => lineId.startsWith('L') ? lineId : `L${lineId}`).join('/');
}

function getPoiCategoryLabel(category: PointOfInterest['category'], t: (key: string) => string): string {
  return t(`poi.category.${category}`);
}

interface StationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (station: StationResult, options?: StationSearchSelectionOptions) => void;
  titleKey?: string;
  nearbyStations?: NearbyStation[];
  selectedStation?: StationResult | null;
  selectedStationHintKey?: string;
  enablePoiSearch?: boolean;
}

export function StationSearchModal({
  visible, onClose, onSelect, titleKey, nearbyStations = [], selectedStation, selectedStationHintKey,
  enablePoiSearch = true,
}: StationSearchModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { t } = useLocale();
  const theme = useAppTheme();
  const modalTitle = t(titleKey ?? 'where_to');
  const selectedHint = selectedStationHintKey ? t(selectedStationHintKey) : undefined;
  const [recentStations, setRecentStations] = useState<SearchHistoryItem[]>([]);
  const [addressResults, setAddressResults] = useState<AddressSearchResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [placeResults, setPlaceResults] = useState<PlaceAutocompleteResult[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placeDetailsLoadingId, setPlaceDetailsLoadingId] = useState<string | null>(null);
  const [placesSessionToken, setPlacesSessionToken] = useState<string>(createPlacesSessionToken);

  useEffect(() => {
    if (visible) {
      setPlacesSessionToken(createPlacesSessionToken());
      CacheService.get<SearchHistoryItem[]>('route_history').then(hist => {
        if (hist) setRecentStations(hist.slice(0, 3));
      });
    }
  }, [visible]);
  const { data: allStations = [], isLoading: loadingAll } = useStations();
  const { data: searchResults = [], isFetching: loadingSearch } = useStationSearch(query);
  const isInitialLoading = loadingAll && allStations.length === 0;
  const hasQuery = query.trim().length > 0;
  const poiResults = useMemo(() => (
    enablePoiSearch && query.trim().length > 0 ? searchPois(query).slice(0, 6) : []
  ), [enablePoiSearch, query]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!visible || !shouldSearchPlacesQuery(normalizedQuery)) {
      setPlaceResults([]);
      setPlacesLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPlacesLoading(true);
      (async () => {
        const allowed = await ConsentService.canUsePlaces();
        if (!allowed) {
          if (!controller.signal.aborted) {
            setPlaceResults([]);
            setPlacesLoading(false);
          }
          return;
        }
        searchPlacesAutocomplete(normalizedQuery, {
          sessionToken: placesSessionToken,
          signal: controller.signal,
        })
          .then(results => {
            if (!controller.signal.aborted) setPlaceResults(results.slice(0, 5));
          })
          .catch(() => {
            if (!controller.signal.aborted) setPlaceResults([]);
          })
          .finally(() => {
            if (!controller.signal.aborted) setPlacesLoading(false);
          });
      })();
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [placesSessionToken, query, visible]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!visible || !shouldSearchAddressQuery(normalizedQuery)) {
      setAddressResults([]);
      setAddressLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setAddressLoading(true);
      (async () => {
        const allowed = await ConsentService.canUsePlaces();
        if (!allowed) {
          if (!controller.signal.aborted) {
            setAddressResults([]);
            setAddressLoading(false);
          }
          return;
        }
        searchAddress(normalizedQuery, {
          signal: controller.signal,
          originLineIds: selectedStation?.lines ?? nearbyStations[0]?.station.lines,
        })
          .then(results => {
            if (!controller.signal.aborted) setAddressResults(results.slice(0, 5));
          })
          .catch(() => {
            if (!controller.signal.aborted) setAddressResults([]);
          })
          .finally(() => {
            if (!controller.signal.aborted) setAddressLoading(false);
          });
      })();
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, visible]);
  const filtered = useMemo(() => {
    if (!query.trim()) return allStations;
    if (query.length >= 2 && searchResults.length > 0) return searchResults;
    const q = normalize(query);
    const lineQuery = q.match(/^l?([1-6]|4a)$/)?.[1]?.toUpperCase();
    return allStations.filter(
      s => normalize(s.name).includes(q) ||
        normalize(s.shortCode).includes(q) ||
      (lineQuery ? (s.lines ?? []).some(line => line.replace(/^L/i, '').toUpperCase() === lineQuery) : false),
    );
  }, [query, allStations, searchResults]);

  function getStationRankScore(station: StationResult): number {
    const q = normalize(query);
    if (!q) return 500;
    const stationName = normalize(station.name);
    const shortCode = normalize(station.shortCode);
    if (stationName === q || shortCode === q) return 1_000;
    if (stationName.startsWith(q) || shortCode.startsWith(q)) return 900;
    if (stationName.includes(q) || shortCode.includes(q)) return 750;
    return 500;
  }

  const searchSections = useMemo<SearchSection[]>(() => {
    const sections: SearchSection[] = [];
    const stationIds = new Set<string>();
    const stationData: SearchResultItem[] = [];

    if (!hasQuery && recentStations.length > 0) {
      sections.push({
        title: t('search.recent'),
        type: 'recent',
        data: recentStations.map((item, index) => ({
          kind: 'recent',
          id: getHistoryKey(item),
          item,
          rankScore: 900 - index,
        })),
      });
    }

    if (!hasQuery) {
      nearbyStations.slice(0, 3).forEach(({ station, distanceMeters }, index) => {
        const freshStation = withFreshStationData(station);
        stationIds.add(freshStation.id);
        stationData.push({
          kind: 'station',
          id: `nearby:${freshStation.id}`,
          station: freshStation,
          distanceMeters,
          isNearby: true,
          rankScore: 850 - index,
        });
      });
    }

    filtered.forEach(station => {
      if (stationIds.has(station.id)) return;
      stationIds.add(station.id);
      stationData.push({
        kind: 'station',
        id: `station:${station.id}`,
        station,
        rankScore: getStationRankScore(station),
      });
    });

    if (stationData.length > 0 || loadingSearch) {
      sections.push({
        title: !hasQuery && (nearbyStations.length > 0 || recentStations.length > 0)
          ? t('search.all_stations')
          : t('search.all_stations'),
        type: 'stations',
        data: stationData.sort((a, b) => b.rankScore - a.rankScore),
        isLoading: loadingSearch,
      });
    }

    const placeAddressData: SearchResultItem[] = [
      ...placeResults.map((place, index) => ({
        kind: 'place' as const,
        id: `place:${place.placeId}`,
        place,
        rankScore: 700 - index,
      })),
      ...addressResults.map((address, index) => ({
        kind: 'address' as const,
        id: `address:${address.id}`,
        address,
        rankScore: 680 - index,
      })),
    ].sort((a, b) => b.rankScore - a.rankScore);

    if (hasQuery && query.trim().length >= 3 && (placesLoading || addressLoading || placeAddressData.length > 0)) {
      sections.push({
        title: t('search.places.section'),
        type: 'places',
        data: placeAddressData,
        isLoading: placesLoading || addressLoading,
      });
    }

    if (hasQuery && poiResults.length > 0) {
      sections.push({
        title: t('poi.nearbyPlaces'),
        type: 'pois',
        data: poiResults.map((poi, index) => ({
          kind: 'poi',
          id: `poi:${poi.id}`,
          poi,
          rankScore: 600 - index,
        })),
      });
    }

    return sections;
  }, [
    addressLoading,
    addressResults,
    filtered,
    hasQuery,
    loadingSearch,
    nearbyStations,
    placeResults,
    placesLoading,
    poiResults,
    query,
    recentStations,
    t,
  ]);

  function handleSelect(station: StationResult, options?: StationSearchSelectionOptions) {
    setQuery('');
    onSelect(station, options);
  }

  function findStationForPoiDestination(resolvedDestination: ResolvedPoiDestination): StationResult | null {
    const normalizedStationId = normalizeStationId(resolvedDestination.routeDestinationStationId);
    const normalizedStationName = normalizeStationId(resolvedDestination.routeDestinationStationName);

    return allStations.find(station =>
      normalizeStationId(station.id) === normalizedStationId ||
      normalizeStationId(station.name) === normalizedStationId ||
      normalizeStationId(station.name) === normalizedStationName,
    ) ?? null;
  }

  function findStationForAddressDestination(resolvedDestination: ResolvedAddressDestination): StationResult | null {
    const normalizedStationId = normalizeStationId(resolvedDestination.routeDestinationStationId);
    const normalizedStationName = normalizeStationId(resolvedDestination.routeDestinationStationName);

    return allStations.find(station =>
      normalizeStationId(station.id) === normalizedStationId ||
      normalizeStationId(station.name) === normalizedStationId ||
      normalizeStationId(station.name) === normalizedStationName,
    ) ?? null;
  }

  function findStationForPlaceDestination(resolvedDestination: ResolvedPlaceDestination): StationResult | null {
    const normalizedStationId = normalizeStationId(resolvedDestination.routeDestinationStationId);
    const normalizedStationName = normalizeStationId(resolvedDestination.routeDestinationStationName);

    return allStations.find(station =>
      normalizeStationId(station.id) === normalizedStationId ||
      normalizeStationId(station.name) === normalizedStationId ||
      normalizeStationId(station.name) === normalizedStationName,
    ) ?? null;
  }

  function handlePoiSelect(poi: PointOfInterest) {
    const resolvedDestination = resolvePoiDestination(poi);
    const station = findStationForPoiDestination(resolvedDestination);
    if (!station) return;

    handleSelect(station, { poiDestination: resolvedDestination });
  }

  function handleAddressSelect(address: AddressSearchResult) {
    const resolvedDestination = resolveAddressDestination(address);
    const station = findStationForAddressDestination(resolvedDestination);
    if (!station) return;

    handleSelect(station, { addressDestination: resolvedDestination });
  }

  async function handlePlaceSelect(place: PlaceAutocompleteResult) {
    if (placeDetailsLoadingId) return;
    if (!(await ConsentService.canUsePlaces())) return;

    setPlaceDetailsLoadingId(place.placeId);
    try {
      const details = await getPlaceDetails(place.placeId, {
        sessionToken: placesSessionToken,
        originLineIds: selectedStation?.lines ?? nearbyStations[0]?.station.lines,
      });
      if (!details) return;

      const resolvedDestination = resolvePlaceDestination(details);
      if (!resolvedDestination) return;

      const station = findStationForPlaceDestination(resolvedDestination);
      if (!station) return;

      setPlacesSessionToken(createPlacesSessionToken());
      handleSelect(station, { placeDestination: resolvedDestination });
    } finally {
      setPlaceDetailsLoadingId(null);
    }
  }

  function buildAddressDestinationFromHistory(item: SearchHistoryItem): ResolvedAddressDestination | null {
    if (item.itemType !== 'address' || !item.addressId || !item.routeStationName) return null;

    return {
      type: 'address',
      displayName: item.displayName ?? item.name,
      routeDestinationStationId: item.id,
      routeDestinationStationName: item.routeStationName,
      lineIds: item.routeLineIds ?? item.lines ?? [],
      distanceMeters: item.routeDistanceMeters ?? 0,
      addressId: item.addressId,
    };
  }

  function buildPlaceDestinationFromHistory(item: SearchHistoryItem): ResolvedPlaceDestination | null {
    if (item.itemType !== 'place' || !item.placeId || !item.routeStationName) return null;

    return {
      type: 'place',
      displayName: item.displayName ?? item.name,
      routeDestinationStationId: item.id,
      routeDestinationStationName: item.routeStationName,
      lineIds: item.routeLineIds ?? item.lines ?? [],
      distanceMeters: item.routeDistanceMeters ?? 0,
      placeId: item.placeId,
    };
  }

  function handleRecentSelect(item: SearchHistoryItem) {
    if (item.itemType === 'poi' && item.poiId) {
      const poi = getPoiById(item.poiId);
      if (poi) {
        handlePoiSelect(poi);
        return;
      }
    }

    if (item.itemType === 'address') {
      const addressDestination = buildAddressDestinationFromHistory(item);
      if (addressDestination) {
        const station = findStationForAddressDestination(addressDestination);
        if (station) {
          handleSelect(station, { addressDestination });
          return;
        }
      }
    }

    if (item.itemType === 'place') {
      const placeDestination = buildPlaceDestinationFromHistory(item);
      if (placeDestination) {
        const station = findStationForPlaceDestination(placeDestination);
        if (station) {
          handleSelect(station, { placeDestination });
          return;
        }
      }
    }

    handleSelect(withFreshStationData(item));
  }

  async function handleClearHistory() {
    await CacheService.set('route_history', [], 30 * 24 * 60 * 60 * 1000);
    setRecentStations([]);
  }

  async function handleRemoveHistoryItem(item: SearchHistoryItem) {
    const nextHistory = recentStations.filter(historyItem => getHistoryKey(historyItem) !== getHistoryKey(item));
    setRecentStations(nextHistory);
    await CacheService.set('route_history', nextHistory, 30 * 24 * 60 * 60 * 1000);
  }

  function renderLineChipsFromLines(stationLines: StationLine[]) {
    if (stationLines.length === 0) return null;

    return (
      <View style={styles.lineChips}>
        {stationLines.map(line => (
          <View key={line} style={[styles.lineChip, { backgroundColor: getLineColor(line) }]}>
            <Text style={styles.lineChipText}>L{line}</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderLineChips(station: StationResult) {
    return renderLineChipsFromLines(getStationLines(station));
  }

  function renderPoiLineChips(poi: PointOfInterest) {
    const primaryStation = getPrimaryPoiStation(poi);
    return renderLineChipsFromLines(toStationLines(primaryStation.lineIds));
  }

  function renderExpressRouteBadges(station: StationResult) {
    const expressRoutes: Array<{ line: StationLine; state: ExpressRouteState }> = [];

    getStationLines(station).forEach(line => {
      const state = getExpressRouteState(`L${line}`, station.name);
      const visibleState = getVisibleExpressRouteState(state);
      if (visibleState) expressRoutes.push({ line, state: visibleState });
    });

    if (expressRoutes.length === 0) return null;

    return (
      <View style={styles.expressRouteBadges}>
        {expressRoutes.map(({ line, state }) => (
          <ExpressRouteBadge
            key={`${station.id}-${line}`}
            type={state.type}
            availability={state.availability}
            compact
          />
        ))}
      </View>
    );
  }

  function withFreshStationData(station: StationResult | SearchHistoryItem) {
    const routeStationName = 'routeStationName' in station && station.routeStationName
      ? station.routeStationName
      : station.name;
    return allStations.find(s =>
      s.id === station.id ||
      normalizeStationId(s.name) === normalizeStationId(routeStationName),
    ) ?? station;
  }

  function renderPoiResult(poi: PointOfInterest) {
    const primaryStation = getPrimaryPoiStation(poi);
    const routeLines = formatLineIds(primaryStation.lineIds);

    return (
      <TouchableOpacity
        key={poi.id}
        style={styles.stationItem}
        onPress={() => handlePoiSelect(poi)}
        activeOpacity={0.7}
      >
        <View style={[styles.stationIcon, { backgroundColor: `${Colors.actionBlue}18` }]}>
          <Feather name="map-pin" size={14} color={Colors.actionBlue} />
        </View>
        <View style={styles.stationInfo}>
          <Text style={[styles.stationName, { color: theme.colors.textPrimary }]}>{poi.name}</Text>
          <Text style={[styles.poiMeta, { color: theme.colors.textTertiary }]}>
            {getPoiCategoryLabel(poi.category, t)} · {t('search.recommendedStation')}: {primaryStation.stationName} · {routeLines}
          </Text>
          <Text style={[styles.poiSummary, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {poi.lastMile.summary}
          </Text>
        </View>
        {renderPoiLineChips(poi)}
      </TouchableOpacity>
    );
  }

  function renderAddressResult(address: AddressSearchResult) {
    const routeLines = formatLineIds(address.nearestStation.lineIds);
    const isFarFromMetro = address.nearestStation.distanceMeters > 2_500;

    return (
      <TouchableOpacity
        key={address.id}
        style={styles.stationItem}
        onPress={() => handleAddressSelect(address)}
        activeOpacity={0.7}
      >
        <View style={[styles.stationIcon, { backgroundColor: `${Colors.actionBlue}18` }]}>
          <Feather name="navigation" size={14} color={Colors.actionBlue} />
        </View>
        <View style={styles.stationInfo}>
          <Text style={[styles.stationName, { color: theme.colors.textPrimary }]}>{address.label}</Text>
          <Text style={[styles.poiMeta, { color: theme.colors.textTertiary }]} numberOfLines={1}>
            {t('search.address.nearestStation')}: {address.nearestStation.name} · {routeLines} · {formatAddressDistance(address.nearestStation.distanceMeters)}
          </Text>
          <Text style={[styles.poiSummary, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {isFarFromMetro ? t('search.address.farFromMetro') : address.formattedAddress}
          </Text>
        </View>
        {renderLineChipsFromLines(toStationLines(address.nearestStation.lineIds))}
      </TouchableOpacity>
    );
  }

  function renderPlaceResult(place: PlaceAutocompleteResult) {
    const isResolving = placeDetailsLoadingId === place.placeId;

    return (
      <TouchableOpacity
        key={place.id}
        style={styles.stationItem}
        onPress={() => { void handlePlaceSelect(place); }}
        activeOpacity={0.7}
        disabled={!!placeDetailsLoadingId}
      >
        <View style={[styles.stationIcon, { backgroundColor: `${Colors.actionBlue}18` }]}>
          <Feather name="map" size={14} color={Colors.actionBlue} />
        </View>
        <View style={styles.stationInfo}>
          <Text style={[styles.stationName, { color: theme.colors.textPrimary }]}>{place.primaryText}</Text>
          {!!place.secondaryText && (
            <Text style={[styles.poiSummary, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {place.secondaryText}
            </Text>
          )}
        </View>
        {isResolving ? (
          <ActivityIndicator size="small" color={Colors.actionBlue} />
        ) : (
          <Feather name="chevron-right" size={16} color={theme.colors.border} />
        )}
      </TouchableOpacity>
    );
  }

  function renderStationResult(item: Extract<SearchResultItem, { kind: 'station' }>) {
    const isSelected = selectedStation?.id === item.station.id;
    return (
      <TouchableOpacity
        style={[
          styles.stationItem,
          isSelected && [styles.stationItemSelected, { backgroundColor: theme.colors.selectedSurface }],
        ]}
        onPress={() => handleSelect(item.station)}
        activeOpacity={0.7}
      >
        <View style={item.isNearby ? styles.nearbyIcon : [styles.stationIcon, { backgroundColor: `${Colors.accentPrimary}22` }]}>
          <Feather
            name={isSelected ? 'check' : item.isNearby ? 'navigation' : 'map-pin'}
            size={14}
            color={item.isNearby ? '#1A73E8' : Colors.accentPrimary}
          />
        </View>
        <View style={styles.stationInfo}>
          <Text style={[styles.stationName, { color: theme.colors.textPrimary }]}>{item.station.name}</Text>
          <View style={styles.stationMeta}>
            <Text style={[styles.stationCode, { color: theme.colors.textTertiary }]}>
              {item.distanceMeters !== undefined ? `${item.distanceMeters} m` : item.station.shortCode}
            </Text>
            {renderLineChips(item.station)}
          </View>
          {renderExpressRouteBadges(item.station)}
        </View>
        {isSelected ? (
          <Text style={styles.selectedBadge}>{t('search.selected')}</Text>
        ) : (
          <Feather name="chevron-right" size={16} color={theme.colors.border} />
        )}
      </TouchableOpacity>
    );
  }

  function renderRecentResult(item: Extract<SearchResultItem, { kind: 'recent' }>) {
    const freshStation = withFreshStationData(item.item);
    const displayName = item.item.displayName ?? item.item.name;
    const historyLines = item.item.routeLineIds ? toStationLines(item.item.routeLineIds) : getStationLines(freshStation);
    return (
      <TouchableOpacity style={styles.stationItem} onPress={() => handleRecentSelect(item.item)} activeOpacity={0.7}>
        <Feather name="clock" size={16} color={theme.colors.textTertiary} />
        <View style={styles.stationInfo}>
          <Text style={[styles.stationName, { color: theme.colors.textPrimary }]}>{displayName}</Text>
          <View style={styles.stationMeta}>
            <Text style={[styles.stationCode, { color: theme.colors.textTertiary }]}>
              {item.item.itemType === 'poi' || item.item.itemType === 'address' || item.item.itemType === 'place'
                ? `${t('search.recommendedStation')}: ${item.item.routeStationName ?? freshStation.name}`
                : freshStation.shortCode}
            </Text>
            {renderLineChipsFromLines(historyLines)}
          </View>
          {item.item.itemType === 'poi' || item.item.itemType === 'place' ? null : renderExpressRouteBadges(freshStation)}
        </View>
        <TouchableOpacity
          onPress={event => {
            event.stopPropagation();
            handleRemoveHistoryItem(item.item);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeRecentButton}
          accessibilityLabel={t('search.removeRecent')}
        >
          <Feather name="x" size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  function renderSearchItem({ item }: { item: SearchResultItem }) {
    if (item.kind === 'recent') return renderRecentResult(item);
    if (item.kind === 'station') return renderStationResult(item);
    if (item.kind === 'place') return renderPlaceResult(item.place);
    if (item.kind === 'address') return renderAddressResult(item.address);
    return renderPoiResult(item.poi);
  }

  function renderSectionHeader({ section }: { section: SearchSection }) {
    return (
      <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>{section.title}</Text>
        {section.isLoading && <ActivityIndicator size="small" color={Colors.actionBlue} />}
        {section.type === 'recent' && (
          <TouchableOpacity onPress={handleClearHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearText}>{t('search.clear')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.surface }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{modalTitle}</Text>
        </View>

        <View style={[
          styles.inputWrapper,
          selectedStation && !query.trim() && styles.inputWrapperSelected,
          {
            backgroundColor: selectedStation && !query.trim()
              ? theme.colors.selectedSurface
              : theme.colors.inputSurface,
            borderColor: selectedStation && !query.trim() ? Colors.actionBlue : 'transparent',
          },
        ]}>
          <Feather name="search" size={18} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary }]}
            placeholder={selectedStation && !query.trim() ? selectedStation.name : t("search.placeholder")}
            placeholderTextColor={selectedStation && !query.trim() ? theme.colors.textPrimary : theme.colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        {selectedStation && !query.trim() && selectedHint && (
          <View style={styles.selectedOriginHint}>
            <Feather name="check-circle" size={14} color="#1A73E8" />
            <Text style={[styles.selectedOriginText, { color: theme.colors.textSecondary }]}>{selectedHint}</Text>
          </View>
        )}

        {isInitialLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.accentPrimary} />
            <Text style={[styles.loadingText, { color: theme.colors.textTertiary }]}>{t("search.loading")}</Text>
          </View>
        ) : (
          <SectionList
            sections={searchSections}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />}
            renderItem={renderSearchItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
            ListEmptyComponent={
              poiResults.length === 0 && placeResults.length === 0 && addressResults.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>{t("search.empty")}</Text>
                  <Text style={styles.emptyAction}>{t('search.view_lines_map')}</Text>
                </View>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function normalize(value: string): string {
  return normalizeSearchText(value);
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
  inputWrapperSelected: {
    backgroundColor: '#F5FAFF',
    borderWidth: 1,
    borderColor: '#D8E9FF',
  },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  selectedOriginHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  selectedOriginText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' },
  stationItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  stationItemSelected: { backgroundColor: '#F7FBFF' },
  stationIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.accentPrimary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  nearbyIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E8F1FF',
    alignItems: 'center', justifyContent: 'center',
  },
  stationInfo: { flex: 1 },
  stationName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  poiMeta: { marginTop: 5, fontSize: 12, color: Colors.textTertiary, fontWeight: '700' },
  poiSummary: { marginTop: 5, fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.graySurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  clearText: { fontSize: 12, fontWeight: '700', color: Colors.accentPrimary },
  stationCode: { fontSize: 12, color: Colors.textTertiary },
  selectedBadge: { fontSize: 11, fontWeight: '800', color: '#1A73E8' },
  removeRecentButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  expressRouteBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  separator: { height: 1, backgroundColor: Colors.grayBorder, marginLeft: 64 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textTertiary },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textTertiary },
  emptyAction: { marginTop: 10, fontSize: 13, color: Colors.actionBlue, fontWeight: '700' },
});
