import { CacheService } from '../src/config/cache.service';
import { useLocalSearchParams } from 'expo-router';
import { useLanguage } from './_layout';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, View, Text, StyleSheet, Dimensions, PanResponder, AppState, TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import {
  isMetroLineId,
} from '@movia/shared-data/metro/line-directions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoviaSidebar, AlertItem, LineItem } from '../src/components/movia/MoviaSidebar';
import { SearchBar } from '../src/components/movia/SearchBar';
import { MapOverlay } from '../src/components/movia/MapOverlay';
import { StationSearchModal } from '../src/components/movia/StationSearchModal';
import { NavigationProgress, Station } from '../src/components/movia/NavigationProgress';
import { useLines } from '../src/hooks/useLines';
import { useNetworkState } from '../src/hooks/useNetworkState';
import { MetroIncident, useMetroIncidents } from '../src/hooks/useMetroIncidents';
import { useEta } from '../src/hooks/useEta';
import { useStations, findNearbyStations, findNearestStationWithDistance, NearbyStation, StationResult } from '../src/hooks/useStations';
import { ENABLE_METRO_INCIDENTS } from '../src/config/featureFlags';
import { IdentityService } from '../src/security/identity.service';
import { LocationService } from '../src/location/location.service';
import { InertialService } from '../src/sensors/InertialService';
import { TripNotificationService } from '../src/notifications/tripNotifications.service';
import {
  AUTO_START_FALLBACK_DELAY_MS,
  HARD_MAX_AUTO_START_RADIUS_METERS,
  buildActiveTripState,
  EMPTY_SENT_TRIP_NOTIFICATIONS,
  markAtTransferSent,
  markDestinationArrivalSent,
  markOneBeforeDestinationSent,
  markOneBeforeTransferSent,
  markStationArrivalSent,
  shouldNotifyAtTransfer,
  shouldNotifyDestinationArrival,
  shouldNotifyOneBeforeDestination,
  shouldNotifyOneBeforeTransfer,
  shouldNotifyStationArrival,
  shouldAutoStartTracking,
  shouldTransitionToArrived,
  transitionTripStatus,
  type ActiveTripState,
  type NavigationMode,
  type RouteStation,
  type SentTripNotifications,
  type TripStatus,
} from '../src/trip/activeTripState';
import { t as translate, SupportedLocale } from '../src/i18n';
import { Colors, getLineColor } from '../src/theme/colors';
import { getExpressRouteState, getVisibleExpressRouteState } from '../src/data/expressRoute';

const { width, height } = Dimensions.get('window');

const SANTIAGO_DEFAULT = {
  latitude: -33.4372, longitude: -70.6344,
  latitudeDelta: 0.05, longitudeDelta: 0.05,
};

const SANTIAGO_CENTER = { latitude: -33.4372, longitude: -70.6344 };
const SANTIAGO_RADIUS_METERS = 35_000;
const NEARBY_STATION_RADIUS_METERS = 500;
const NEARBY_SUGGESTION_RADIUS_METERS = 2_000;

const HAS_GOOGLE_MAPS_KEY = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
);
const DEBUG_GPS = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_GPS === '1';

type AppScreen = 'map' | 'searching' | 'navigating';
type LineNumber = '1' | '2' | '3' | '4' | '4A' | '5' | '6';
type OriginSource = 'manual' | 'gps-nearest-station' | 'history' | 'planning-mode' | 'empty';
type NavigationConfidenceMode = 'normal' | 'gps-unstable' | 'hybrid' | 'approximate' | 'recalculating' | 'offline' | 'error';

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

function toActiveTripNavigationMode(mode: NavigationConfidenceMode): NavigationMode {
  if (mode === 'error' || mode === 'recalculating') return 'approximate';
  return mode;
}

function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m < 1 ? '< 1 min' : `${m} min`;
}

function formatArrival(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatRelativeTime(iso: string, locale: SupportedLocale): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (locale === 'pt-BR') return minutes <= 1 ? 'há 1 min' : `há ${minutes} min`;
  if (locale === 'en-US') return minutes <= 1 ? '1 min ago' : `${minutes} min ago`;
  return minutes <= 1 ? 'hace 1 min' : `hace ${minutes} min`;
}

function toLineLabel(id?: string): string {
  return `L${toLineNumber(id)}`;
}

function toIncidentSidebarStatus(status?: MetroIncident['status']): LineItem['status'] | null {
  switch (status) {
    case 'normal':
      return 'normal';
    case 'delay':
    case 'partial':
      return 'delay';
    case 'interrupted':
    case 'unknown':
      return 'alert';
    default:
      return null;
  }
}

function getIncidentTitle(incident: MetroIncident, locale: SupportedLocale): string {
  if (incident.status !== 'unknown') return incident.title;
  if (locale === 'pt-BR') return 'Não foi possível verificar o estado desta linha.';
  if (locale === 'en-US') return 'Could not verify this line status.';
  return 'No fue posible verificar el estado de esta línea.';
}

function getIncidentDescription(incident: MetroIncident, locale: SupportedLocale): string | undefined {
  if (incident.status !== 'unknown') return incident.description;
  if (locale === 'pt-BR') return 'Consulte metro.cl para informações atualizadas.';
  if (locale === 'en-US') return 'Check metro.cl for updated information.';
  return 'Consulte metro.cl para información actualizada.';
}

function getNavigationConfidenceLabel(mode: NavigationConfidenceMode, locale: SupportedLocale): string {
  const labels: Record<SupportedLocale, Record<NavigationConfidenceMode, string>> = {
    'pt-BR': {
      normal: 'Navegação normal',
      'gps-unstable': 'Sinal instável',
      hybrid: 'Modo híbrido',
      approximate: 'Estimativa aproximada',
      recalculating: 'Recalculando rota',
      offline: 'Sem internet',
      error: 'Rota perdida',
    },
    'es-CL': {
      normal: 'Navegación normal',
      'gps-unstable': 'Señal inestable',
      hybrid: 'Modo híbrido',
      approximate: 'Estimación aproximada',
      recalculating: 'Recalculando ruta',
      offline: 'Sin internet',
      error: 'Ruta perdida',
    },
    'en-US': {
      normal: 'Normal navigation',
      'gps-unstable': 'Unstable signal',
      hybrid: 'Hybrid mode',
      approximate: 'Approximate estimate',
      recalculating: 'Recalculating route',
      offline: 'No internet',
      error: 'Route lost',
    },
  };

  return labels[locale][mode];
}

function getArrivalMessage(stationName: string, locale: SupportedLocale): string {
  if (locale === 'pt-BR') return `Você chegou em ${stationName}`;
  if (locale === 'en-US') return `You arrived at ${stationName}`;
  return `Llegaste a ${stationName}`;
}

function getDestinationArrivalMessage(stationName: string, locale: SupportedLocale): string {
  if (locale === 'pt-BR') return `Você chegou ao seu destino ${stationName}`;
  if (locale === 'en-US') return `You arrived at your destination ${stationName}`;
  return `Llegaste a tu destino ${stationName}`;
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
  const [originSource, setOriginSource] = useState<OriginSource>('empty');
  const [destination, setDestination] = useState<StationResult | null>(null);
  const [userLat, setUserLat]         = useState<number | null>(null);
  const [userLon, setUserLon]         = useState<number | null>(null);
  const [locating, setLocating]       = useState(false);
  const [currentTrackedStationIndex, setCurrentTrackedStationIndex] = useState<number | null>(null);
  const [visualFocusedStationIndex, setVisualFocusedStationIndex] = useState(0);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const [locationMode, setLocationMode] = useState<'loading' | 'nearby' | 'planning' | 'manual' | 'denied'>('loading');
  const [navigationConfidenceMode, setNavigationConfidenceMode] = useState<NavigationConfidenceMode>('normal');
  const [tripStatus, setTripStatus] = useState<TripStatus>('ended');
  const [showManualStartFallback, setShowManualStartFallback] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<SentTripNotifications>(EMPTY_SENT_TRIP_NOTIFICATIONS);
  const [arrivalBanner, setArrivalBanner] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const activeStationIdRef = useRef<string | null>(null);

  const { data: linesData,    isLoading: linesLoading }  = useLines();
  const { data: networkState }                           = useNetworkState();
  const { data: metroIncidents }                         = useMetroIncidents();
  const { data: stationsData }                           = useStations();
  const { data: etaData, isLoading: etaLoading }         = useEta(
    origin?.id, destination?.id,
  );
  const locale = toLocale(language);

  // Monta LineItem[] mesclando linhas + networkState
  const lines: LineItem[] = (linesData ?? []).map(l => ({
    number: toLineNumber(l.id),
    name:   l.name,
    status: ENABLE_METRO_INCIDENTS
      ? toIncidentSidebarStatus(metroIncidents?.incidents.find(s => s.lineId === l.id)?.status)
        ?? toSidebarStatus(networkState?.find(s => s.lineId === l.id)?.status)
      : 'normal',
  }));
  const incidentsSourceLabel = ENABLE_METRO_INCIDENTS ? translate('alerts.source_metro_site', locale) : undefined;
  const incidentsUpdatedLabel = ENABLE_METRO_INCIDENTS && metroIncidents?.updatedAt
    ? `${translate('alerts.updated', locale)} ${formatRelativeTime(metroIncidents.updatedAt, locale)}`
    : undefined;
  const alerts: AlertItem[] = ENABLE_METRO_INCIDENTS
    ? (metroIncidents?.incidents ?? [])
      .filter(item => item.status !== 'normal')
      .map(item => ({
        lineId: item.lineId,
        type: item.status === 'delay' ? 'delay' : 'alert',
        text: getIncidentTitle(item, locale),
        description: getIncidentDescription(item, locale),
        time: `${translate('alerts.updated', locale)} ${formatRelativeTime(item.updatedAt, locale)}`,
        sourceLabel: translate('alerts.source_metro_site', locale),
      }))
    : [];

  const etaPath = etaData?.path ?? [];
  const selectedRouteStationIndex = 0;
  // TODO(active-trip-state): remover estado paralelo
  const currentPathIndex = currentTrackedStationIndex ?? selectedRouteStationIndex;
  const stationById = new Map((stationsData ?? []).map(s => [s.id, s]));
  const orderedRoutePath: RouteStation[] = etaPath
    .map(p => {
      const station = stationById.get(p.id);
      if (!station || !isMetroLineId(p.lineId)) return null;
      return {
        id: p.id,
        name: p.name,
        lineId: p.lineId,
        latitude: station.latitude,
        longitude: station.longitude,
      };
    })
    .filter((station): station is RouteStation => Boolean(station));

  const routePathKey = etaPath
    .map(station => `${station.id}:${station.lineId}`)
    .join('>');
  const routeKey = origin && destination && etaData
    ? `${origin.id}:${destination.id}:${routePathKey}`
    : null;
  const canShowCurrentStation = tripStatus === 'active' || tripStatus === 'arrived';
  const hasCurrentStation = canShowCurrentStation && currentTrackedStationIndex !== null;
  const navigationConfidenceLabel = getNavigationConfidenceLabel(navigationConfidenceMode, locale);
  const currentRouteStationIndex = hasCurrentStation
    ? Math.min(currentPathIndex, orderedRoutePath.length - 1)
    : null;
  const activeTripState: ActiveTripState | null = routeKey && orderedRoutePath.length > 0
    ? buildActiveTripState({
      routeId: routeKey,
      orderedRoutePath,
      currentStationIndex: currentRouteStationIndex,
      navigationMode: toActiveTripNavigationMode(navigationConfidenceMode),
      sentNotifications,
      tripStatus,
    })
    : null;
  const sentNotificationsKey = [
    sentNotifications.stationArrivalStationIds.join('|'),
    sentNotifications.oneBeforeTransferStationIds.join('|'),
    sentNotifications.atTransferStationIds.join('|'),
    sentNotifications.oneBeforeDestinationSent ? '1' : '0',
    sentNotifications.destinationArrivalSent ? '1' : '0',
  ].join(';');
  const currentDirection = activeTripState?.directionTerminal ?? undefined;
  const navigationConfidenceColor = navigationConfidenceMode === 'error'
    ? Colors.alertDangerText
    : getLineColor(activeTripState?.currentLine);
  const transferPointByIndex = new Map(
    (activeTripState?.transferPoints ?? []).map((transferPoint) => [transferPoint.index, transferPoint]),
  );

  function applyTripStatusTransition(nextStatus: TripStatus) {
    setTripStatus(currentStatus => (
      transitionTripStatus({ tripStatus: currentStatus }, nextStatus).tripStatus
    ));
  }

  function startTripTracking(params: {
    source: 'auto-gps' | 'manual-fallback';
    detectedStationIndex: number;
  }) {
    const nextStationIndex = Math.max(
      0,
      Math.min(params.detectedStationIndex, Math.max(orderedRoutePath.length - 1, 0)),
    );

    activeStationIdRef.current = orderedRoutePath[nextStationIndex]?.id ?? null;
    setCurrentTrackedStationIndex(nextStationIndex);
    setVisualFocusedStationIndex(nextStationIndex);
    setShowManualStartFallback(false);
    setNavigationConfidenceMode(params.source === 'manual-fallback' ? 'hybrid' : 'normal');
    applyTripStatusTransition('active');

    if (__DEV__) {
      console.log('[START_TRIP_TRACKING]', {
        source: params.source,
        currentStationIndex: nextStationIndex,
        currentStation: orderedRoutePath[nextStationIndex]?.name ?? null,
      });
    }
  }

  function handleManualStartFallback() {
    if (!activeTripState || activeTripState.tripStatus !== 'preview' || activeTripState.orderedRoutePath.length === 0) {
      return;
    }

    startTripTracking({
      source: 'manual-fallback',
      detectedStationIndex: 0,
    });
  }

  // TODO(active-trip-state): remover estado paralelo
  // Converte path do ETA em Station[] para NavigationProgress
  const stations: Station[] = etaPath.map((p, i) => {
    const transferPoint = transferPointByIndex.get(i);
    const hasConfirmedStation = currentTrackedStationIndex !== null && canShowCurrentStation;
    const expressRouteState = activeTripState?.currentStationIndex === i
      ? activeTripState.expressRoute
      : getExpressRouteState(p.lineId, p.name);
    return {
      id: p.id,
      name:   p.name,
      line:   toLineNumber(p.lineId),
      status: hasConfirmedStation
        ? i < currentPathIndex ? 'completed' : i === currentPathIndex ? tripStatus === 'arrived' ? 'arrived' : 'current' : i === currentPathIndex + 1 ? 'next' : transferPoint ? 'transfer' : 'upcoming'
        : transferPoint ? 'transfer' : i === visualFocusedStationIndex ? 'next' : 'upcoming',
      direction: p.lineId === activeTripState?.currentLine
        ? activeTripState.directionTerminal ?? undefined
        : undefined,
      expressRoute: getVisibleExpressRouteState(expressRouteState),
      transfer: transferPoint
        ? { line: toLineNumber(transferPoint.toLine), name: transferPoint.stationName, direction: transferPoint.directionTerminal ?? undefined }
        : undefined,
    };
  });

  // TODO(active-trip-state): remover estado paralelo
  // Coordenadas da rota para Polyline (Opção A — cruza path com stationsData)
  const routeCoordinates = (activeTripState?.orderedRoutePath ?? [])
    .map(s => ({ latitude: s.latitude, longitude: s.longitude }));
  const completedRouteCoordinates = activeTripState?.currentStationIndex === null
    ? []
    : routeCoordinates.slice(0, Math.min(currentPathIndex + 1, routeCoordinates.length));
  const remainingRouteCoordinates = activeTripState?.currentStationIndex === null
    ? routeCoordinates
    : routeCoordinates.slice(Math.max(currentPathIndex, 0));

  useEffect(() => {
    if (!__DEV__ || !activeTripState) return;

    console.log('[CURRENT_BANNER_DEBUG]', {
      tripStatus: activeTripState.tripStatus,
      currentStationIndex: activeTripState.currentStationIndex,
      currentStation: activeTripState.currentStation?.name ?? null,
      currentLine: activeTripState.currentLine,
      shouldShowCurrentStationBanner:
        activeTripState.tripStatus === 'active' &&
        activeTripState.currentStationIndex !== null &&
        activeTripState.currentStation !== null,
    });

    const mapPolylinePoints = activeTripState.orderedRoutePath.map(station => ({
      latitude: station.latitude,
      longitude: station.longitude,
      stationName: station.name,
      lineId: station.lineId,
    }));

    console.log('[ROUTE_PATH_ORDER]', activeTripState.orderedRoutePath.map(s => ({
      name: s.name,
      lineId: s.lineId,
      lat: s.latitude,
      lng: s.longitude,
    })));
    console.log('[MAP_POLYLINE_POINTS]', mapPolylinePoints.map(p => ({
      name: p.stationName,
      lineId: p.lineId,
      lat: p.latitude,
      lng: p.longitude,
    })));
    console.log('[CURRENT_ROUTE_STATE]', {
      origin: activeTripState.originStation.name,
      destination: activeTripState.destinationStation.name,
      currentStationIndex: activeTripState.currentStationIndex,
      currentStationName: activeTripState.currentStation?.name ?? null,
      nextStationName: activeTripState.nextStation?.name ?? null,
    });
  }, [activeTripState?.routeId, activeTripState?.currentStationIndex]);

  useEffect(() => {
    if (
      !activeTripState ||
      screen !== 'navigating' ||
      tripStatus === 'preview' ||
      tripStatus === 'ended' ||
      activeTripState.currentStationIndex === null ||
      activeTripState.currentStation === null ||
      activeTripState.currentStationIndex === 0
    ) return;

    if (!shouldNotifyStationArrival(activeTripState)) return;
    const arrivedStation = activeTripState.currentStation;
    if (!arrivedStation) return;

    const isDestination = activeTripState.currentStationIndex === activeTripState.orderedRoutePath.length - 1;
    const arrivalMessage = isDestination
      ? getDestinationArrivalMessage(arrivedStation.name, locale)
      : getArrivalMessage(arrivedStation.name, locale);

    setArrivalBanner(arrivalMessage);
    if (shouldTransitionToArrived(activeTripState)) {
      applyTripStatusTransition('arrived');
    }
    const timer = setTimeout(() => setArrivalBanner(null), 4500);
    const shouldNotifyDestination = isDestination && shouldNotifyDestinationArrival(activeTripState);
    if (shouldNotifyDestination) {
      TripNotificationService.notifyNextStation(
        translate('notification.destination.title', locale),
        arrivalMessage,
      )
        .catch(() => undefined)
        .finally(() => {
          let nextTripState = markStationArrivalSent(activeTripState, arrivedStation.id);
          nextTripState = markDestinationArrivalSent(nextTripState);
          // Marcação em finally garante execução independente de sucesso ou falha.
          // Sem retry automático dentro da mesma viagem.
          // Trade-off aceito: notificação pode ser perdida, nunca duplicada.
          setSentNotifications(nextTripState.sentNotifications);
        });
    } else {
      setSentNotifications(
        markStationArrivalSent(activeTripState, arrivedStation.id).sentNotifications,
      );
    }

    return () => clearTimeout(timer);
  }, [activeTripState?.routeId, activeTripState?.currentStationIndex, sentNotificationsKey, screen, locale, tripStatus]);

  useEffect(() => {
    if (!activeTripState || screen !== 'navigating' || activeTripState.tripStatus === 'preview' || activeTripState.tripStatus === 'ended') return;
    if (activeTripState.currentStationIndex === null) return;

    const lineNumber = toLineNumber(activeTripState.currentLine);
    const lineColor = getLineColor(activeTripState.currentLine);
    const directionText = activeTripState.directionTerminal
      ? `L${lineNumber} · ${translate('direction', locale)} ${activeTripState.directionTerminal}`
      : `L${lineNumber}`;
    const nextText = activeTripState.nextStation
      ? `${translate('navigation.next', locale)}: ${activeTripState.nextStation.name}`
      : activeTripState.destinationStation.name;

    let title = `${etaData ? formatMinutes(etaData.timing.totalEstimatedSeconds) : '--'} · ${nextText}`;
    let body = `${directionText}\n${navigationConfidenceLabel}`;

    const activeTransferPoint = activeTripState.transferPoints.find(
      transferPoint => transferPoint.index === activeTripState.currentStationIndex,
    );

    if (activeTripState.tripStatus === 'arrived') {
      title = translate('trip.completed', locale);
      body = getDestinationArrivalMessage(activeTripState.destinationStation.name, locale);
    } else if (activeTransferPoint) {
      title = translate('notification.transfer.prepare_title', locale);
      body = `${translate('notification.transfer.prepare_body', locale)} ${activeTransferPoint.stationName}. ${directionText}`;
    }

    TripNotificationService.updateActiveTrip({
      routeId: activeTripState.routeId,
      title,
      body,
      lineColor,
      tripStatus: activeTripState.tripStatus,
    }).catch(() => undefined);
  }, [
    activeTripState?.routeId,
    activeTripState?.currentStationIndex,
    activeTripState?.currentLine,
    activeTripState?.directionTerminal,
    activeTripState?.tripStatus,
    screen,
    etaData?.timing.totalEstimatedSeconds,
    navigationConfidenceLabel,
    locale,
  ]);

  function applyGpsOrigin(
    loc: { latitude: number; longitude: number },
    allStations: StationResult[] | undefined,
    options: { allowManualOverwrite?: boolean } = {},
  ) {
    if (!allStations?.length) return false;

    const nearest = findNearestStationWithDistance(allStations, loc.latitude, loc.longitude);
    const nearby = findNearbyStations(allStations, loc.latitude, loc.longitude, NEARBY_STATION_RADIUS_METERS);
    const suggestions = nearby.length > 0
      ? nearby
      : findNearbyStations(allStations, loc.latitude, loc.longitude, NEARBY_SUGGESTION_RADIUS_METERS);
    setNearbyStations(suggestions.length > 0 ? suggestions.slice(0, 3) : nearest ? [nearest] : []);

    if (DEBUG_GPS) {
      console.log('[GPS]', { userLat: loc.latitude, userLng: loc.longitude });
      console.log('[NEAREST_STATION]', {
        stationName: nearest?.station.name,
        distanceMeters: nearest?.distanceMeters,
      });
      console.log('[ORIGIN_SOURCE]', {
        selectedOrigin: origin?.id ?? null,
        source: originSource,
      });
    }

    if (originSource === 'manual' && !options.allowManualOverwrite) {
      setLocationMode(nearby.length > 0 ? 'nearby' : 'manual');
      return false;
    }

    if (nearest) {
      setOrigin(nearest.station);
      setOriginSource('gps-nearest-station');
      setLocationMode('nearby');
      return true;
    }

    if (originSource === 'gps-nearest-station' || originSource === 'empty') {
      setOrigin(null);
      setOriginSource('empty');
    }
    setLocationMode('manual');
    return false;
  }

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
    IdentityService.getProfileName().then(setProfileName);
  }, []);

  useEffect(() => {
    setSentNotifications(EMPTY_SENT_TRIP_NOTIFICATIONS);
    activeStationIdRef.current = null;
    setCurrentTrackedStationIndex(null);
    setVisualFocusedStationIndex(0);
    setArrivalBanner(null);
    setNavigationConfidenceMode('normal');
    setShowManualStartFallback(false);
    applyTripStatusTransition(routeKey ? 'preview' : 'ended');
  }, [routeKey]);

  useEffect(() => {
    if (screen !== 'navigating' || tripStatus !== 'preview' || !routeKey || !activeTripState) {
      setShowManualStartFallback(false);
      return undefined;
    }

    setShowManualStartFallback(false);
    const timer = setTimeout(() => {
      setShowManualStartFallback(true);
    }, AUTO_START_FALLBACK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [screen, tripStatus, routeKey, activeTripState?.routeId]);

  useEffect(() => {
    if (
      screen !== 'navigating' ||
      (tripStatus !== 'preview' && tripStatus !== 'active') ||
      !etaData ||
      !stationsData ||
      !destination ||
      !routeKey ||
      !activeTripState
    ) {
      return undefined;
    }

    let cancelled = false;
    const routeId = routeKey;
    const routeActiveTripState = activeTripState;
    const routeEta = etaData;
    const routeDestination = destination;
    const routeTransferPoints = routeActiveTripState.transferPoints;
    const routePath = routeActiveTripState.orderedRoutePath;
    const routeNavigationMode = routeActiveTripState.navigationMode;
    const routeSentNotifications = routeActiveTripState.sentNotifications;
    const routeStations = routeEta.path
      .map(p => stationById.get(p.id))
      .filter((s): s is StationResult => !!s);

    async function syncActiveStation() {
      const loc = await LocationService.getCurrentLocation();
      if (cancelled || !loc.latitude || !loc.longitude || routeStations.length === 0) {
        setNavigationConfidenceMode('approximate');
        return;
      }

      setUserLat(loc.latitude);
      setUserLon(loc.longitude);
      setNavigationConfidenceMode('normal');

      const nearest = findNearestStationWithDistance(routeStations, loc.latitude, loc.longitude);
      const nearestPathIndex = nearest
        ? routeEta.path.findIndex(p => p.id === nearest.station.id)
        : -1;
      const nearestRouteStation = nearestPathIndex >= 0
        ? routePath[nearestPathIndex] ?? null
        : null;
      const shouldStartTracking = shouldAutoStartTracking({
        tripStatus,
        orderedRoutePath: routePath,
        userLocation: { latitude: loc.latitude, longitude: loc.longitude },
        nearestRouteStation,
        distanceToNearestRouteStationMeters: nearest?.distanceMeters ?? null,
      });

      if (shouldStartTracking && nearestPathIndex >= 0) {
        startTripTracking({
          source: 'auto-gps',
          detectedStationIndex: nearestPathIndex,
        });
        return;
      }

      if (tripStatus !== 'active') {
        return;
      }

      if (!nearest || nearest.distanceMeters > HARD_MAX_AUTO_START_RADIUS_METERS) {
        setNavigationConfidenceMode('hybrid');
        return;
      }

      activeStationIdRef.current = nearest.station.id;

      if (nearestPathIndex < 0) return;
      setCurrentTrackedStationIndex(nearestPathIndex);
      setVisualFocusedStationIndex(nearestPathIndex);
      const locale = toLocale(language);
      let notificationTripState = buildActiveTripState({
        routeId,
        orderedRoutePath: routePath,
        currentStationIndex: nearestPathIndex,
        navigationMode: routeNavigationMode,
        sentNotifications: routeSentNotifications,
        tripStatus,
      });

      if (shouldNotifyOneBeforeDestination(notificationTripState)) {
        try {
          await TripNotificationService.notifyNextStation(
            translate('notification.next_station.title', locale),
            `${translate('notification.next_station.body', locale)} ${routeDestination.name}.`,
          );
        } catch {
          // Falha de notificação não dispara retry automático nesta viagem.
        } finally {
          notificationTripState = markOneBeforeDestinationSent(notificationTripState);
          // Marcação em finally garante execução independente de sucesso ou falha.
          // Sem retry automático dentro da mesma viagem.
          // Trade-off aceito: notificação pode ser perdida, nunca duplicada.
          setSentNotifications(notificationTripState.sentNotifications);
        }
      }

      for (const transferPoint of routeTransferPoints) {
        const nextLine = toLineNumber(transferPoint.toLine);
        const directionText = transferPoint.directionTerminal
          ? ` · ${translate('direction', locale)} ${transferPoint.directionTerminal}`
          : '';
        if (shouldNotifyOneBeforeTransfer(notificationTripState, transferPoint)) {
          try {
            await TripNotificationService.notifyNextStation(
              translate('notification.transfer.prepare_title', locale),
              `${translate('notification.transfer.prepare_body', locale)} ${transferPoint.stationName}. ${toLineLabel(transferPoint.toLine)}${directionText}`,
            );
          } catch {
            // Falha de notificação não dispara retry automático nesta viagem.
          } finally {
            notificationTripState = markOneBeforeTransferSent(notificationTripState, transferPoint.stationId);
            // Marcação em finally garante execução independente de sucesso ou falha.
            // Sem retry automático dentro da mesma viagem.
            // Trade-off aceito: notificação pode ser perdida, nunca duplicada.
            setSentNotifications(notificationTripState.sentNotifications);
          }
        }

        if (shouldNotifyAtTransfer(notificationTripState, transferPoint)) {
          try {
            await TripNotificationService.notifyNextStation(
              translate('notification.transfer.now_title', locale),
              `${translate('notification.transfer.now_body', locale)} ${nextLine}${directionText}.`,
            );
          } catch {
            // Falha de notificação não dispara retry automático nesta viagem.
          } finally {
            notificationTripState = markAtTransferSent(notificationTripState, transferPoint.stationId);
            // Marcação em finally garante execução independente de sucesso ou falha.
            // Sem retry automático dentro da mesma viagem.
            // Trade-off aceito: notificação pode ser perdida, nunca duplicada.
            setSentNotifications(notificationTripState.sentNotifications);
          }
        }
      }
    }

    syncActiveStation();
    const timer = setInterval(syncActiveStation, tripStatus === 'preview' ? 3000 : 20_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [screen, etaData, stationsData, destination, routeKey, language, tripStatus, activeTripState?.routeId, sentNotificationsKey]);

  useEffect(() => {
    if (screen !== 'navigating' || tripStatus !== 'active' || !etaData || etaPath.length === 0 || navigationConfidenceMode === 'normal') {
      return undefined;
    }

    const startedAt = Date.now();
    const secondsPerStation = Math.max(45, etaData.timing.totalEstimatedSeconds / Math.max(etaPath.length - 1, 1));

    const timer = setInterval(() => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      const nextIndex = Math.min(Math.floor(elapsedSeconds / secondsPerStation), etaPath.length - 1);
      const nextStationId = etaPath[nextIndex]?.id;
      if (!nextStationId) return;
      activeStationIdRef.current = nextStationId;
      setCurrentTrackedStationIndex(nextIndex);
      setVisualFocusedStationIndex(nextIndex);
    }, 15_000);

    return () => clearInterval(timer);
  }, [screen, etaData, etaPath.length, routeKey, navigationConfidenceMode, tripStatus]);

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
          const distanceToSantiago = findNearbyStations(
            [{
              id: 'santiago_center',
              name: 'Santiago',
              shortCode: 'SCL',
              latitude: SANTIAGO_CENTER.latitude,
              longitude: SANTIAGO_CENTER.longitude,
            }],
            loc.latitude,
            loc.longitude,
            SANTIAGO_RADIUS_METERS,
          );
          if (distanceToSantiago.length === 0) {
            setLocationMode('planning');
            setOrigin(null);
            setOriginSource('planning-mode');
            setRegion(SANTIAGO_DEFAULT);
            mapRef.current?.animateToRegion(SANTIAGO_DEFAULT, 800);
          } else {
            const r = { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 };
            setRegion(r);
            mapRef.current?.animateToRegion(r, 800);
            if (!applyGpsOrigin({ latitude: loc.latitude, longitude: loc.longitude }, stationsData)) {
              setLocationMode('manual');
            }
          }
        }
      } else {
        setLocationMode('denied');
        setOriginSource('empty');
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
    setOriginSource('manual');
    setCurrentTrackedStationIndex(null);
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

      const isInsideSantiago = findNearbyStations(
        [{
          id: 'santiago_center',
          name: 'Santiago',
          shortCode: 'SCL',
          latitude: SANTIAGO_CENTER.latitude,
          longitude: SANTIAGO_CENTER.longitude,
        }],
        loc.latitude,
        loc.longitude,
        SANTIAGO_RADIUS_METERS,
      ).length > 0;

      if (!isInsideSantiago) {
        setLocationMode('planning');
        setNearbyStations([]);
        setOrigin(null);
        setOriginSource('planning-mode');
        setRegion(SANTIAGO_DEFAULT);
        mapRef.current?.animateToRegion(SANTIAGO_DEFAULT, 700);
        setSelectingOrigin(true);
        return;
      }

      const nextRegion = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 700);

      const didSetOrigin = applyGpsOrigin({ latitude: loc.latitude, longitude: loc.longitude }, stationsData);
      if (didSetOrigin) {
        setSelectingOrigin(false);
      } else if (stationsData) {
        setSelectingOrigin(true);
      } else {
        setLocationMode('manual');
        setSelectingOrigin(true);
      }
    } finally {
      setLocating(false);
    }
  }

  // Auto-detecta estação de origem via GPS quando estações carregam
  useEffect(() => {
    if (!stationsData || !userLat || !userLon || locationMode === 'planning' || locationMode === 'denied') return;
    if (originSource === 'manual') return;
    applyGpsOrigin({ latitude: userLat, longitude: userLon }, stationsData);
  }, [stationsData, userLat, userLon, originSource, locationMode]);

  // Quando ETA chega, vai para navegação
  useEffect(() => {
    if (etaData && screen === 'searching') setScreen('navigating');
  }, [etaData]);

  function handleDestinationSelect(station: StationResult) {
    setDestination(station);
    setCurrentTrackedStationIndex(null);
    // Salva no histórico sempre
      CacheService.get<StationResult[]>('route_history').then((hist: StationResult[] | null) => {
        const history: StationResult[] = hist ?? [];
        const entry = { ...station, timestamp: Date.now() };
        const updated = [entry, ...history.filter((h: StationResult) => h.id !== station.id)].slice(0, 3);
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
    setOriginSource('manual');
    setDestination(origin);
    setCurrentTrackedStationIndex(null);
    setScreen('navigating');
  }

  function handleCloseNavigation() {
    if (routeKey) TripNotificationService.endActiveTrip(routeKey).catch(() => undefined);
    setDestination(null);
    applyTripStatusTransition('ended');
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
          {completedRouteCoordinates.length > 1 && (
            <Polyline
              coordinates={completedRouteCoordinates}
              strokeColor="#B8C0CC"
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}
          {remainingRouteCoordinates.length > 1 && (
            <Polyline
              coordinates={remainingRouteCoordinates}
              strokeColor={getLineColor(activeTripState?.currentLine, Colors.actionBlue)}
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}
          {origin && (
            <Marker
              coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
              title={`Origem: ${origin.name}`}
              pinColor={getLineColor(activeTripState?.currentLine, Colors.actionBlue)}
            />
          )}
          {destination && (
            <Marker
              coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
              title={`Destino: ${destination.name}`}
              pinColor="#1A73E8"
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

      {locationMode !== 'nearby' && locationMode !== 'manual' && (
        <View style={[styles.contextBanner, { top: insets.top + 116 }]}>
          <Text style={styles.contextTitle}>
            {locationMode === 'loading' ? translate('location.detecting', toLocale(language)) : translate('location.plan_santiago', toLocale(language))}
          </Text>
          <Text style={styles.contextText}>
            {locationMode === 'denied'
              ? translate('location.enable_for_nearby', toLocale(language))
              : translate('location.choose_origin', toLocale(language))}
          </Text>
        </View>
      )}

      {arrivalBanner && (
        <View style={[styles.arrivalBanner, { top: insets.top + 116 }]}>
          <Feather name="map-pin" size={16} color="#fff" />
          <Text style={styles.arrivalBannerText} numberOfLines={2}>{arrivalBanner}</Text>
        </View>
      )}

      <TouchableOpacity
        accessibilityLabel="Centralizar no usuario"
        activeOpacity={0.82}
        disabled={locating}
        onPress={handleLocateUser}
        style={[styles.locationButton, { top: insets.top + (locationMode === 'planning' || locationMode === 'denied' || locationMode === 'loading' ? 176 : 116) }, locating && styles.locationButtonDisabled]}
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
        alerts={alerts}
        isLoading={linesLoading}
        currentLanguage={language}
        onLanguageChange={setLanguage}
        profileName={profileName}
        locationLabel={locationMode === 'planning' ? 'Santiago, CL' : locationMode === 'denied' ? translate('location.permission_denied', toLocale(language)) : 'Santiago, CL'}
        contextLabel={locationMode === 'nearby' ? translate('location.near_santiago_metro', toLocale(language)) : translate('location.plan_trip_short', toLocale(language))}
        incidentsSourceLabel={incidentsSourceLabel}
        incidentsUpdatedLabel={incidentsUpdatedLabel}
        showIncidentStatus={ENABLE_METRO_INCIDENTS}
      />

      {/* NavigationProgress como overlay — mapa continua vivo */}
      {screen === 'navigating' && destination && (
        <NavigationProgress
          origin={origin?.name ?? 'Origen'}
          destination={destination.name}
          estimatedTime={etaData ? formatMinutes(etaData.timing.totalEstimatedSeconds) : etaLoading ? '...' : '--'}
          arrivalTime={etaData ? formatArrival(etaData.arrivalTime) : '--:--'}
          stations={stations}
          currentLine={toLineNumber(activeTripState?.currentLine ?? etaData?.linesOnRoute?.[0])}
          currentDirection={currentDirection}
          navigationConfidenceLabel={navigationConfidenceLabel}
          navigationConfidenceColor={navigationConfidenceColor}
          tripStatus={tripStatus}
          activeTripState={activeTripState}
          isDetectingAutoStart={activeTripState?.tripStatus === 'preview' && !showManualStartFallback}
          showManualStartFallback={activeTripState?.tripStatus === 'preview' && showManualStartFallback}
          onManualStartFallback={handleManualStartFallback}
          onClose={handleCloseNavigation}
        />
      )}
      <StationSearchModal
        visible={selectingOrigin}
        onClose={() => setSelectingOrigin(false)}
        onSelect={handleOriginSelect}
        titleKey="search.origin_title"
        nearbyStations={nearbyStations}
        selectedStation={origin}
        selectedStationHintKey={originSource === 'gps-nearest-station' ? 'search.nearest_station' : undefined}
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
  arrivalBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(17,24,39,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  arrivalBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  searchWrapper: { position: 'absolute', left: 16, right: 16 },
  contextBanner: {
    position: 'absolute',
    left: 16,
    right: 86,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contextTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  contextText: { marginTop: 3, fontSize: 12, fontWeight: '500', color: '#6B7280' },
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
