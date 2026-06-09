import { CacheService } from '../src/config/cache.service';
import { useLocalSearchParams } from 'expo-router';
import { useLanguage } from './_layout';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, View, StyleSheet, Dimensions, PanResponder, AppState, TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoviaSidebar, LineItem } from '../src/components/movia/MoviaSidebar';
import { SearchBar } from '../src/components/movia/SearchBar';
import { MapOverlay } from '../src/components/movia/MapOverlay';
import { StationSearchModal } from '../src/components/movia/StationSearchModal';
import { NavigationProgress, Station } from '../src/components/movia/NavigationProgress';
import { useLines } from '../src/hooks/useLines';
import { useNetworkState } from '../src/hooks/useNetworkState';
import { useEta } from '../src/hooks/useEta';
import { useStations, findNearestStation, StationResult } from '../src/hooks/useStations';
import { IdentityService } from '../src/security/identity.service';
import { LocationService } from '../src/location/location.service';
import { InertialService } from '../src/sensors/InertialService';
import { TripNotificationService } from '../src/notifications/tripNotifications.service';
import { t as translate, SupportedLocale } from '../src/i18n';

const { width, height } = Dimensions.get('window');

const SANTIAGO_DEFAULT = {
  latitude: -33.4372, longitude: -70.6344,
  latitudeDelta: 0.05, longitudeDelta: 0.05,
};

const HAS_GOOGLE_MAPS_KEY = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
);

type AppScreen = 'map' | 'searching' | 'navigating';
type LineNumber = '1' | '2' | '3' | '4' | '4A' | '5' | '6';

const VALID_LINE_NUMBERS: LineNumber[] = ['1', '2', '3', '4', '4A', '5', '6'];

function toLineNumber(id?: string): LineNumber {
  const lineNumber = id?.replace(/^L/i, '') as LineNumber | undefined;
  return lineNumber && VALID_LINE_NUMBERS.includes(lineNumber) ? lineNumber : '1';
}

function toLocale(language: string): SupportedLocale {
  if (language === 'PT') return 'pt-BR';
  if (language === 'EN') return 'en-US';
  return 'es-CL';
}

function toSidebarStatus(s?: string): 'normal' | 'delay' | 'alert' | 'suspended' {
  switch (s) {
    case 'DELAYED':   return 'delay';
    case 'FAULTY':    return 'alert';
    case 'SUSPENDED': return 'suspended';
    default:          return 'normal';
  }
}

function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m < 1 ? '< 1 min' : `${m} min`;
}

function formatArrival(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const inertialRef = useRef(new InertialService());

  const [screen, setScreen]           = useState<AppScreen>('map');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const [region, setRegion]           = useState(SANTIAGO_DEFAULT);
  const [origin, setOrigin]           = useState<StationResult | null>(null);
  const [destination, setDestination] = useState<StationResult | null>(null);
  const [userLat, setUserLat]         = useState<number | null>(null);
  const [userLon, setUserLon]         = useState<number | null>(null);
  const [locating, setLocating]       = useState(false);
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const notifiedRouteRef = useRef<string | null>(null);

  const { data: linesData,    isLoading: linesLoading }  = useLines();
  const { data: networkState }                           = useNetworkState();
  const { data: stationsData }                           = useStations();
  const { data: etaData, isLoading: etaLoading }         = useEta(
    origin?.id, destination?.id,
  );

  // Monta LineItem[] mesclando linhas + networkState
  const lines: LineItem[] = (linesData ?? []).map(l => ({
    number: toLineNumber(l.id),
    name:   l.name,
    status: toSidebarStatus(networkState?.find(s => s.lineId === l.id)?.status),
  }));

  const etaPath = etaData?.path ?? [];
  const activeStationIndex = activeStationId
    ? etaPath.findIndex(p => p.id === activeStationId)
    : -1;
  const currentPathIndex = activeStationIndex >= 0 ? activeStationIndex : 0;

  // Converte path do ETA em Station[] para NavigationProgress
  const stations: Station[] = etaPath.map((p, i) => ({
    name:   p.name,
    status: i < currentPathIndex ? 'passed' : i === currentPathIndex ? 'current' : 'future',
    transfer: etaPath[i + 1]?.lineId && etaPath[i + 1].lineId !== p.lineId
      ? { line: toLineNumber(etaPath[i + 1].lineId), name: etaPath[i + 1].name }
      : undefined,
  }));

  // Coordenadas da rota para Polyline (Opção A — cruza path com stationsData)
  const stationById = new Map((stationsData ?? []).map(s => [s.id, s]));
  const routeCoordinates = etaPath
    .map(p => stationById.get(p.id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map(s => ({ latitude: s.latitude, longitude: s.longitude }));

  const routeKey = origin && destination && etaData
    ? `${origin.id}:${destination.id}:${etaData.arrivalTime}`
    : null;

  // Swipe da esquerda abre sidebar
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx > 20 && Math.abs(g.dy) < 30,
      onPanResponderRelease: (_, g) => { if (g.dx > 60) setSidebarOpen(true); },
    }),
  ).current;

  // Sensores param em background
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') inertialRef.current.stop();
      else if (state === 'active') inertialRef.current.start();
    });
    return () => sub.remove();
  }, []);

  // Boot: idioma + GPS
  useEffect(() => {
    TripNotificationService.configure();
  }, []);

  useEffect(() => {
    if (routeKey) notifiedRouteRef.current = null;
    setActiveStationId(null);
  }, [routeKey]);

  useEffect(() => {
    if (screen !== 'navigating' || !etaData || !stationsData || !destination || !routeKey) {
      return undefined;
    }

    let cancelled = false;
    const routeEta = etaData;
    const routeDestination = destination;
    const routeStations = routeEta.path
      .map(p => stationById.get(p.id))
      .filter((s): s is StationResult => !!s);

    async function syncActiveStation() {
      const loc = await LocationService.getCurrentLocation();
      if (cancelled || !loc.latitude || !loc.longitude || routeStations.length === 0) {
        return;
      }

      setUserLat(loc.latitude);
      setUserLon(loc.longitude);

      const nearest = findNearestStation(routeStations, loc.latitude, loc.longitude);
      if (!nearest) return;

      setActiveStationId(nearest.id);

      const nearestPathIndex = routeEta.path.findIndex(p => p.id === nearest.id);
      const penultimateIndex = routeEta.path.length - 2;

      if (
        nearestPathIndex === penultimateIndex &&
        notifiedRouteRef.current !== routeKey
      ) {
        notifiedRouteRef.current = routeKey;
        const locale = toLocale(language);
        await TripNotificationService.notifyNextStation(
          translate('notification.next_station.title', locale),
          `${translate('notification.next_station.body', locale)} ${routeDestination.name}.`,
        );
      }
    }

    syncActiveStation();
    const timer = setInterval(syncActiveStation, 20_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [screen, etaData, stationsData, destination, routeKey, language]);

  useEffect(() => {
    async function init() {
      const lang = await IdentityService.getPreferredLanguage();
      setLanguage(lang.toLowerCase().startsWith('pt') ? 'PT' : lang.toLowerCase().startsWith('en') ? 'EN' : 'ES');

      const status = await LocationService.requestPermission();
      if (status === 'granted') {
        const loc = await LocationService.getCurrentLocation();
        if (loc.latitude && loc.longitude) {
          setUserLat(loc.latitude);
          setUserLon(loc.longitude);
          const r = { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 };
          setRegion(r);
          mapRef.current?.animateToRegion(r, 800);
        }
      }
    }
    init();
  }, []);

  // Detecta modo "origem manual" vindo de no-location
  const { selectOrigin } = useLocalSearchParams<{ selectOrigin?: string }>();
  const [selectingOrigin, setSelectingOrigin] = React.useState(false);

  useEffect(() => {
    if (selectOrigin === '1') setSelectingOrigin(true);
  }, [selectOrigin]);

  function handleOriginSelect(station: StationResult) {
    setOrigin(station);
    setActiveStationId(null);
    setSelectingOrigin(false);
    if (destination) {
      setScreen('navigating');
    }
  }

  async function handleLocateUser() {
    if (locating) return;

    setLocating(true);
    try {
      let status = await LocationService.getPermissionStatus();
      if (status !== 'granted') {
        status = await LocationService.requestPermission();
      }

      if (status !== 'granted') {
        setSelectingOrigin(true);
        return;
      }

      const loc = await LocationService.getCurrentLocation();
      if (!loc.latitude || !loc.longitude) {
        setSelectingOrigin(true);
        return;
      }

      setUserLat(loc.latitude);
      setUserLon(loc.longitude);

      const nextRegion = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 700);

      const nearest = stationsData
        ? findNearestStation(stationsData, loc.latitude, loc.longitude)
        : null;

      if (nearest) {
        setOrigin(nearest);
      }
    } finally {
      setLocating(false);
    }
  }

  // Auto-detecta estação de origem via GPS quando estações carregam
  useEffect(() => {
    if (!stationsData || !userLat || !userLon || origin) return;
    const nearest = findNearestStation(stationsData, userLat, userLon);
    if (nearest) setOrigin(nearest);
  }, [stationsData, userLat, userLon]);

  // Quando ETA chega, vai para navegação
  useEffect(() => {
    if (etaData && screen === 'searching') setScreen('navigating');
  }, [etaData]);

  function handleDestinationSelect(station: StationResult) {
    setDestination(station);
    setActiveStationId(null);
    // Salva no histórico sempre
      CacheService.get<StationResult[]>('route_history').then((hist: StationResult[] | null) => {
        const history: StationResult[] = hist ?? [];
        const entry = { ...station, timestamp: Date.now() };
        const updated = [entry, ...history.filter((h: StationResult) => h.id !== station.id)].slice(0, 10);
        CacheService.set('route_history', updated, 30 * 24 * 60 * 60 * 1000);
      });
    if (origin) {
      setScreen('navigating');
    } else {
      setScreen('map');
      setSelectingOrigin(true);
    }
  }

  function handleSwapRoute() {
    if (!origin || !destination) return;
    setOrigin(destination);
    setDestination(origin);
    setActiveStationId(null);
    notifiedRouteRef.current = null;
    setScreen('navigating');
  }

  function handleCloseNavigation() {
    setDestination(null);
    setActiveStationId(null);
    setScreen('map');
  }


  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {HAS_GOOGLE_MAPS_KEY ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}
          followsUserLocation
        >
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#1A73E8"
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}
          {origin && (
            <Marker
              coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
              title={origin.name}
              pinColor="#1A73E8"
            />
          )}
          {destination && (
            <Marker
              coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
              title={destination.name}
              pinColor="#E31837"
            />
          )}
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapFallback]} />
      )}
      <MapOverlay />

      <View style={[styles.searchWrapper, { top: insets.top + 12 }]}>
        <SearchBar
          onMenuClick={() => setSidebarOpen(true)}
          onOriginClick={() => setSelectingOrigin(true)}
          onDestinationClick={() => setScreen('searching')}
          onSwapRoute={handleSwapRoute}
          originName={origin?.name}
          destinationName={destination?.name}
          canSwap={!!origin && !!destination}
        />
      </View>

      <TouchableOpacity
        accessibilityLabel="Centralizar no usuario"
        activeOpacity={0.82}
        disabled={locating}
        onPress={handleLocateUser}
        style={[styles.locationButton, { top: insets.top + 116 }, locating && styles.locationButtonDisabled]}
      >
        {locating ? (
          <ActivityIndicator color="#1A73E8" />
        ) : (
          <Feather name="navigation" size={22} color="#1A73E8" />
        )}
      </TouchableOpacity>

      <MoviaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        lines={lines}
        isLoading={linesLoading}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      {/* NavigationProgress como overlay — mapa continua vivo */}
      {screen === 'navigating' && destination && (
        <NavigationProgress
          origin={origin?.name ?? 'Origen'}
          destination={destination.name}
          estimatedTime={etaData ? formatMinutes(etaData.timing.totalEstimatedSeconds) : etaLoading ? '...' : '--'}
          arrivalTime={etaData ? formatArrival(etaData.arrivalTime) : '--:--'}
          stations={stations}
          currentLine={toLineNumber(etaPath[currentPathIndex]?.lineId ?? etaData?.linesOnRoute?.[0])}
          onClose={handleCloseNavigation}
        />
      )}
      <StationSearchModal
        visible={selectingOrigin}
        onClose={() => setSelectingOrigin(false)}
        onSelect={handleOriginSelect}
        titleKey="search.origin_title"
      />
      <StationSearchModal
        visible={screen === 'searching'}
        onClose={() => setScreen('map')}
        onSelect={handleDestinationSelect}
        
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  mapFallback: { backgroundColor: '#EEF2F3' },
  searchWrapper: { position: 'absolute', left: 16, right: 16 },
  locationButton: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 5,
  },
  locationButtonDisabled: { opacity: 0.7 },
});
