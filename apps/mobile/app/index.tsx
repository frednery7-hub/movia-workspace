import { CacheService } from '../src/config/cache.service';
import { useLocalSearchParams } from 'expo-router';
import { LocaleProvider } from '../src/context/LocaleContext';
import type { SupportedLocale } from '../src/context/LocaleContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Dimensions, PanResponder, AppState,
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

const { width, height } = Dimensions.get('window');

const SANTIAGO_DEFAULT = {
  latitude: -33.4372, longitude: -70.6344,
  latitudeDelta: 0.05, longitudeDelta: 0.05,
};

type AppScreen = 'map' | 'searching' | 'navigating';
type Language = 'ES' | 'PT' | 'EN';

function toLineNumber(id: string) {
  return id.replace(/^L/i, '') as '1' | '2' | '3' | '4' | '4A' | '5' | '6';
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
  const [language, setLanguage]       = useState<Language>('ES');
  const localeMap: Record<Language, SupportedLocale> = {
    ES: 'es-CL', PT: 'pt-BR', EN: 'en-US',
  };
  const currentLocale = localeMap[language];
  const [region, setRegion]           = useState(SANTIAGO_DEFAULT);
  const [origin, setOrigin]           = useState<StationResult | null>(null);
  const [destination, setDestination] = useState<StationResult | null>(null);
  const [userLat, setUserLat]         = useState<number | null>(null);
  const [userLon, setUserLon]         = useState<number | null>(null);

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

  // Converte path do ETA em Station[] para NavigationProgress
  const stations: Station[] = (etaData?.path ?? []).map((p, i) => ({
    name:   p.name,
    status: i === 0 ? 'current' : 'future',
  }));

  // Coordenadas da rota para Polyline (Opção A — cruza path com stationsData)
  const stationById = new Map((stationsData ?? []).map(s => [s.id, s]));
  const routeCoordinates = (etaData?.path ?? [])
    .map(p => stationById.get(p.id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map(s => ({ latitude: s.latitude, longitude: s.longitude }));

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
    setSelectingOrigin(false);
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
    // Salva no histórico sempre
      CacheService.get<StationResult[]>('route_history').then((hist: StationResult[] | null) => {
        const history: StationResult[] = hist ?? [];
        const entry = { ...station, timestamp: Date.now() };
        const updated = [entry, ...history.filter((h: StationResult) => h.id !== station.id)].slice(0, 10);
        CacheService.set('route_history', updated, 30 * 24 * 60 * 60 * 1000);
      });
    if (!origin) {
      // sem origem GPS — usa estação mais próxima do centro de Santiago como fallback
      setOrigin({ id: 'st_universidad_de_chile', name: 'Universidad de Chile', shortCode: 'UCH', latitude: -33.4415, longitude: -70.6503 });
    }
    setScreen('navigating');
  }

  function handleCloseNavigation() {
    setDestination(null);
    setScreen('map');
  }


  return (
    <LocaleProvider locale={currentLocale}>
    <View style={styles.container} {...panResponder.panHandlers}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation
      />

      {/* Rota no mapa */}
      {routeCoordinates.length > 1 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#1A73E8"
          strokeWidth={4}
          lineDashPattern={[0]}
        />
      )}
      {/* Marker origem */}
      {origin && (
        <Marker
          coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
          title={origin.name}
          pinColor="#1A73E8"
        />
      )}
      {/* Marker destino */}
      {destination && (
        <Marker
          coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
          title={destination.name}
          pinColor="#E31837"
        />
      )}
      <MapOverlay />

      <View style={[styles.searchWrapper, { top: insets.top + 12 }]}>
        <SearchBar onMenuClick={() => setSidebarOpen(true)} onSearchClick={() => setScreen('searching')} />
      </View>

      <MoviaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        lines={lines}
        isLoading={linesLoading}
        currentLanguage={language}
        onLanguageChange={(lang) => { setLanguage(lang); IdentityService.setPreferredLanguage(lang); }}
      />

      {/* NavigationProgress como overlay — mapa continua vivo */}
      {screen === 'navigating' && destination && (
        <NavigationProgress
          origin={origin?.name ?? 'Origen'}
          destination={destination.name}
          estimatedTime={etaData ? formatMinutes(etaData.timing.totalEstimatedSeconds) : etaLoading ? '...' : '--'}
          arrivalTime={etaData ? formatArrival(etaData.arrivalTime) : '--:--'}
          stations={stations}
          currentLine={(etaData?.linesOnRoute?.[0]?.replace('L','') ?? '1') as '1'|'2'|'3'|'4'|'4A'|'5'|'6'}
          onClose={handleCloseNavigation}
        />
      )}
      <StationSearchModal
        visible={selectingOrigin}
        onClose={() => setSelectingOrigin(false)}
        onSelect={handleOriginSelect}
        title="¿Desde dónde viajes?"
      />
      <StationSearchModal
        visible={screen === 'searching'}
        onClose={() => setScreen('map')}
        onSelect={handleDestinationSelect}
        title="Para onde?"
      />
    </View>
    </LocaleProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  searchWrapper: { position: 'absolute', left: 16, right: 16 },
});
