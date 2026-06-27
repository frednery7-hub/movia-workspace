import { CacheService } from '../src/config/cache.service';
import { router, useLocalSearchParams } from 'expo-router';
import { useLanguage } from './_layout';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, View, Text, StyleSheet, Dimensions, PanResponder, AppState, TouchableOpacity, Animated,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import {
  isMetroLineId,
} from '@movia/shared-data/metro/line-directions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoviaSidebar, AlertItem, LineItem } from '../src/components/movia/MoviaSidebar';
import { SearchBar } from '../src/components/movia/SearchBar';
import { MapOverlay } from '../src/components/movia/MapOverlay';
import {
  StationSearchModal,
  type SearchHistoryItem,
  type StationSearchSelectionOptions,
} from '../src/components/movia/StationSearchModal';
import { NavigationProgress, Station } from '../src/components/movia/NavigationProgress';
import { useLines } from '../src/hooks/useLines';
import { useNetworkState } from '../src/hooks/useNetworkState';
import { MetroIncident, useMetroIncidents } from '../src/hooks/useMetroIncidents';
import { useEta } from '../src/hooks/useEta';
import { useStations, findNearbyStations, findNearestStationWithDistance, NearbyStation, StationResult } from '../src/hooks/useStations';
import { ENABLE_METRO_INCIDENTS } from '../src/config/featureFlags';
import { IdentityService } from '../src/security/identity.service';
import { LocationService } from '../src/location/location.service';
import { getLocationMemoryCacheTtlForTripStatus } from '../src/location/locationMemoryCache';
import { InertialService } from '../src/sensors/InertialService';
import { LocationFusion } from '../src/sensors/LocationFusion';
import type { RawGpsReading } from '../src/sensors/LocationFusion';
import { postFusedLocation } from '../src/location/geoLocationApi';
import { TripNotificationService } from '../src/notifications/tripNotifications.service';
import {
  CURRENT_STATION_BANNER_RADIUS_METERS,
  AUTO_DETECT_MAX_DURATION_MS,
  HARD_MAX_STATION_MATCH_RADIUS_METERS,
  buildActiveTripState,
  deriveStationProgress,
  EMPTY_SENT_TRIP_NOTIFICATIONS,
  buildOneBeforeDestinationNoticeId,
  buildOneBeforeTransferNoticeId,
  markOneBeforeTransferSent,
  markOneBeforeDestinationSent,
  markStationArrivalSent,
  shouldNotifyOneBeforeTransfer,
  shouldNotifyOneBeforeDestination,
  shouldNotifyStationArrival,
  shouldAutoStartTracking,
  shouldTransitionToArrived,
  startTripTracking,
  transitionTripStatus,
  type ActiveTripState,
  type NavigationMode,
  type RouteStation,
  type SentTripNotifications,
  type StartTripTrackingSource,
  type StationProgressState,
  type TripStatus,
} from '../src/trip/activeTripState';
import { t as translate, SupportedLocale } from '../src/i18n';
import { Colors, getLineColor, getRouteGradient } from '../src/theme/colors';
import { useAppTheme } from '../src/theme/ThemeContext';
import { getExpressRouteState, getVisibleExpressRouteState } from '../src/data/expressRoute';
import type { PointOfInterest, ResolvedPoiDestination } from '../src/poi/types';
import { normalizeStationId } from '../src/poi/search/normalizeStationId';
import { resolvePoiDestination } from '../src/poi/search/resolvePoiDestination';
import type { ResolvedAddressDestination } from '../src/search/address/addressSearchApi';
import type { ResolvedPlaceDestination } from '../src/search/places/placesSearchTypes';
import { ConsentService } from '../src/privacy/consent.service';
import { PermissionExplainerModal } from '../src/components/movia/PermissionExplainerModal';
import { buildActiveTripProgress, getActiveTimelineNotice } from '../src/trip/tripProgress';
import {
  getAudioSafetyReminderState,
  markAudioSafetyReminderShown,
  shouldShowAudioSafetyReminder,
} from '../src/safety/audioSafetyReminder';
import {
  clearActiveTripCache,
  createActiveTripCache,
  hasActiveTripNoticeFired,
  markActiveTripNoticeFired,
  recalculateProgressClockFromCache,
  saveActiveTripCache,
  updateActiveTripCache,
  type ActiveTripCache,
} from '../src/trip/activeTripCache';
import { getAccessesForStation } from '../src/poi/search/getAccessesForStation';

const { width, height } = Dimensions.get('window');

const SANTIAGO_DEFAULT = {
  latitude: -33.4372, longitude: -70.6344,
  latitudeDelta: 0.05, longitudeDelta: 0.05,
};

const SANTIAGO_CENTER = { latitude: -33.4372, longitude: -70.6344 };
const SANTIAGO_RADIUS_METERS = 35_000;
const NEARBY_STATION_RADIUS_METERS = 500;
const ACTIVE_STATION_SYNC_INTERVAL_MS = 5_000;
const NEARBY_SUGGESTION_RADIUS_METERS = 2_000;

const HAS_GOOGLE_MAPS_KEY = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
);
const DEBUG_GPS = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_GPS === '1';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#172033' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#CBD5E1' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1020' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1F2937' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#12301F' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#273449' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#243049' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F2742' }] },
];

type AppScreen = 'map' | 'searching' | 'navigating';
type LineNumber = '1' | '2' | '3' | '4' | '4A' | '5' | '6';
type OriginSource = 'manual' | 'gps-nearest-station' | 'history' | 'planning-mode' | 'empty';
type NavigationConfidenceMode = 'normal' | 'gps-unstable' | 'hybrid' | 'approximate' | 'recalculating' | 'offline' | 'error';

const VALID_LINE_NUMBERS: LineNumber[] = ['1', '2', '3', '4', '4A', '5', '6'];

function toLineNumber(id?: string): LineNumber {
  const lineNumber = id?.replace(/^L/i, '') as LineNumber | undefined;
  return lineNumber && VALID_LINE_NUMBERS.includes(lineNumber) ? lineNumber : '1';
}

function getPrimaryStationLine(station?: StationResult | null) {
  const lineId = station?.lines?.find(isMetroLineId);
  return lineId ?? null;
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
      normal: 'Operação normal',
      'gps-unstable': 'Sinal instável',
      hybrid: 'Modo híbrido',
      approximate: 'Estimativa aproximada',
      recalculating: 'Recalculando rota',
      offline: 'Sem internet',
      error: 'Rota perdida',
    },
    'es-CL': {
      normal: 'Operación normal',
      'gps-unstable': 'Señal inestable',
      hybrid: 'Modo híbrido',
      approximate: 'Estimación aproximada',
      recalculating: 'Recalculando ruta',
      offline: 'Sin internet',
      error: 'Ruta perdida',
    },
    'en-US': {
      normal: 'Normal operation',
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

async function getLocationWithTimeout(timeoutMs: number, options: { cacheTtlMs?: number } = {}) {
  return Promise.race([
    LocationService.getCurrentLocation(options),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('LOCATION_DETECTION_TIMEOUT'));
      }, timeoutMs);
    }),
  ]);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const inertialRef = useRef(new InertialService());
  const locationFusionRef = useRef(new LocationFusion());

  const [screen, setScreen]           = useState<AppScreen>('map');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const [region, setRegion]           = useState(SANTIAGO_DEFAULT);
  const [origin, setOrigin]           = useState<StationResult | null>(null);
  const [originSource, setOriginSource] = useState<OriginSource>('empty');
  const [destination, setDestination] = useState<StationResult | null>(null);
  const [destinationDisplayName, setDestinationDisplayName] = useState<string | null>(null);
  const [userLat, setUserLat]         = useState<number | null>(null);
  const [userLon, setUserLon]         = useState<number | null>(null);
  const [locating, setLocating]       = useState(false);
  const [currentTrackedStationIndex, setCurrentTrackedStationIndex] = useState<number | null>(null);
  const [visualFocusedStationIndex, setVisualFocusedStationIndex] = useState(0);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const [locationMode, setLocationMode] = useState<'loading' | 'nearby' | 'planning' | 'manual' | 'denied'>('loading');
  const [navigationConfidenceMode, setNavigationConfidenceMode] = useState<NavigationConfidenceMode>('normal');
  const [tripStatus, setTripStatus] = useState<TripStatus>('ended');
  const [stationProgressState, setStationProgressState] = useState<StationProgressState>('between-stations');
  const [currentStationDistanceMeters, setCurrentStationDistanceMeters] = useState<number | null>(null);
  const [sentNotifications, setSentNotifications] = useState<SentTripNotifications>(EMPTY_SENT_TRIP_NOTIFICATIONS);
  const [arrivalBanner, setArrivalBanner] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [selectedRouteOptionId, setSelectedRouteOptionId] = useState('recommended');
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);
  const [showAudioSafetyReminder, setShowAudioSafetyReminder] = useState(false);
  const [progressClock, setProgressClock] = useState(() => Date.now());
  const activeStationIdRef = useRef<string | null>(null);
  const routeStartedAtRef = useRef(Date.now());
  const activeTripCacheRef = useRef<ActiveTripCache | null>(null);
  const noticeBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptOpacity = useRef(new Animated.Value(0)).current;
  const promptTranslateY = useRef(new Animated.Value(8)).current;

  const { data: linesData,    isLoading: linesLoading }  = useLines();
  const { data: networkState }                           = useNetworkState();
  const { data: metroIncidents }                         = useMetroIncidents();
  const { data: stationsData }                           = useStations();
  const { data: etaResponse, isLoading: etaLoading }     = useEta(
    origin?.id, destination?.id,
  );
  const selectedRouteOption = etaResponse?.routes?.find(route => route.id === selectedRouteOptionId);
  const etaData = etaResponse && selectedRouteOption
    ? { ...etaResponse, ...selectedRouteOption, routes: etaResponse.routes }
    : etaResponse;
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
    ? `${origin.id}:${destination.id}:${selectedRouteOptionId}:${routePathKey}`
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
  const routeGradientCurrentLine = activeTripState?.currentLine
    ?? orderedRoutePath[0]?.lineId
    ?? getPrimaryStationLine(origin)
    ?? 'L1';
  const routeGradientNextLine = activeTripState?.nextLine
    ?? activeTripState?.transferPoints[0]?.toLine
    ?? null;
  const routeGradientColors = getRouteGradient({
    currentLine: routeGradientCurrentLine,
    nextLine: routeGradientNextLine,
    hasTransfer: routeGradientNextLine !== null,
  });
  const originAccess = origin
    ? getAccessesForStation(origin.id).find(access => access.type === 'entrance' || access.type === 'both') ?? null
    : null;
  const destinationAccess = destination
    ? getAccessesForStation(destination.id).find(access => access.type === 'exit' || access.type === 'both') ?? null
    : null;
  const tripProgress = activeTripState && etaData
    ? buildActiveTripProgress({
      routeId: activeTripState.routeId,
      stationIds: activeTripState.orderedRoutePath.map(station => station.id),
      tripStatus,
      currentStationIndex: activeTripState.currentStationIndex,
      elapsedSeconds: Math.max(0, (progressClock - routeStartedAtRef.current) / 1000),
      totalEstimatedSeconds: etaData.timing.totalEstimatedSeconds,
      navigationMode: activeTripState.navigationMode,
      estimatedArrivalTime: etaData.arrivalTime,
    })
    : null;
  const timelineNotice = activeTripState ? getActiveTimelineNotice(activeTripState) : null;
  const alternativeRoute = etaResponse?.routes?.find(route => route.type === 'alternative') ?? null;

  useEffect(() => {
    if (!activeTripState || !tripProgress || !etaData || tripStatus !== 'active') return;

    const previousCache = activeTripCacheRef.current;
    activeTripCacheRef.current = previousCache?.routeId === activeTripState.routeId
      ? updateActiveTripCache(previousCache, {
        routeSnapshot: etaData,
        progressState: tripProgress,
        phase: activeTripState.phase,
      })
      : createActiveTripCache({
        routeId: activeTripState.routeId,
        routeSnapshot: etaData,
        progressState: tripProgress,
        phase: activeTripState.phase,
      });
  }, [activeTripState?.routeId, activeTripState?.phase, etaData, tripProgress, tripStatus]);

  function applyTripStatusTransition(nextStatus: TripStatus) {
    setTripStatus(currentStatus => (
      transitionTripStatus({ tripStatus: currentStatus }, nextStatus).tripStatus
    ));
  }

  function applyStartTripTracking(params: {
    source: StartTripTrackingSource;
    detectedStationIndex: number;
  }) {
    if (!activeTripState) return;

    const nextTripState = startTripTracking({
      state: activeTripState,
      source: params.source,
      detectedStationIndex: params.detectedStationIndex,
    });
    if (nextTripState.tripStatus !== 'active' || nextTripState.currentStationIndex === null) return;

    activeStationIdRef.current = nextTripState.currentStation?.id ?? null;
    setCurrentTrackedStationIndex(nextTripState.currentStationIndex);
    setVisualFocusedStationIndex(nextTripState.currentStationIndex);
    setNavigationConfidenceMode(nextTripState.navigationMode);
    applyTripStatusTransition(nextTripState.tripStatus);

  }

  function showTransientRouteBanner(message: string) {
    setArrivalBanner(message);
    if (noticeBannerTimerRef.current) {
      clearTimeout(noticeBannerTimerRef.current);
    }
    noticeBannerTimerRef.current = setTimeout(() => {
      setArrivalBanner(null);
      noticeBannerTimerRef.current = null;
    }, 4500);
  }

  // TODO(active-trip-state): remover estado paralelo
  // Converte path do ETA em Station[] para NavigationProgress
  const stations: Station[] = etaPath.map((p, i) => {
    const transferPoint = transferPointByIndex.get(i);
    const hasConfirmedStation =
      currentTrackedStationIndex !== null &&
      canShowCurrentStation &&
      (stationProgressState === 'at-station' || tripStatus === 'arrived') &&
      currentStationDistanceMeters !== null &&
      currentStationDistanceMeters <= CURRENT_STATION_BANNER_RADIUS_METERS;
    const expressRouteState = activeTripState?.currentStationIndex === i
      ? activeTripState.expressRoute
      : getExpressRouteState(p.lineId, p.name);
    return {
      id: p.id,
      name:   p.name,
      line:   toLineNumber(p.lineId),
      status: hasConfirmedStation
        ? i < currentPathIndex ? 'completed' : i === currentPathIndex ? tripStatus === 'arrived' ? 'arrived' : 'current' : i === currentPathIndex + 1 ? 'next' : transferPoint ? 'transfer' : 'upcoming'
        : i === visualFocusedStationIndex ? 'next' : transferPoint ? 'transfer' : 'upcoming',
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
    setSentNotifications(
      markStationArrivalSent(activeTripState, arrivedStation.id).sentNotifications,
    );

    return () => clearTimeout(timer);
  }, [activeTripState?.routeId, activeTripState?.currentStationIndex, sentNotificationsKey, screen, locale, tripStatus]);

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

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      const cache = activeTripCacheRef.current;
      if (!cache) return;

      if (state === 'background' || state === 'inactive') {
        saveActiveTripCache(cache).catch(() => undefined);
        return;
      }

      if (state === 'active' && cache.routeId === activeTripState?.routeId) {
        routeStartedAtRef.current = recalculateProgressClockFromCache({
          routeStartedAtMs: routeStartedAtRef.current,
          cachedAt: cache.lastUpdatedAt,
        });
        setProgressClock(Date.now());
      }
    });
    return () => sub.remove();
  }, [activeTripState?.routeId]);

  // Boot: idioma + GPS
  useEffect(() => {
    TripNotificationService.configure();
    IdentityService.getProfileName().then(setProfileName);
    Animated.parallel([
      Animated.timing(promptOpacity, { toValue: 1, duration: 560, delay: 180, useNativeDriver: true }),
      Animated.timing(promptTranslateY, { toValue: 0, duration: 560, delay: 180, useNativeDriver: true }),
    ]).start();
    return () => {
      if (noticeBannerTimerRef.current) {
        clearTimeout(noticeBannerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSentNotifications(EMPTY_SENT_TRIP_NOTIFICATIONS);
    activeStationIdRef.current = null;
    activeTripCacheRef.current = null;
    if (noticeBannerTimerRef.current) {
      clearTimeout(noticeBannerTimerRef.current);
      noticeBannerTimerRef.current = null;
    }
    setCurrentTrackedStationIndex(null);
    setVisualFocusedStationIndex(0);
    setArrivalBanner(null);
    setNavigationConfidenceMode('normal');
    setCurrentStationDistanceMeters(null);
    setStationProgressState('between-stations');
    applyTripStatusTransition(routeKey ? 'preview' : 'ended');
    routeStartedAtRef.current = Date.now();
    setProgressClock(Date.now());
    if (!routeKey) {
      clearActiveTripCache().catch(() => undefined);
    }
  }, [routeKey]);

  useEffect(() => {
    if (tripStatus !== 'active') return undefined;
    routeStartedAtRef.current = Date.now();
    setProgressClock(Date.now());
    const timer = setInterval(() => setProgressClock(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [tripStatus]);

  useEffect(() => {
    setSelectedRouteOptionId('recommended');
  }, [origin?.id, destination?.id]);

  useEffect(() => {
    if (tripStatus !== 'active') return;
    let cancelled = false;
    Promise.all([
      TripNotificationService.getPermissionStatus(),
      CacheService.get<boolean>('notification_permission_explainer_seen'),
    ]).then(([status, seen]) => {
      if (!cancelled && status === 'undetermined' && !seen) {
        setShowNotificationPermission(true);
      }
    });
    return () => { cancelled = true; };
  }, [tripStatus]);

  useEffect(() => {
    if (tripStatus !== 'active') return;
    let cancelled = false;
    getAudioSafetyReminderState()
      .then(state => {
        if (!cancelled && shouldShowAudioSafetyReminder(state)) {
          setShowAudioSafetyReminder(true);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [tripStatus]);

  async function handleDismissAudioSafetyReminder() {
    setShowAudioSafetyReminder(false);
    await markAudioSafetyReminderShown();
  }

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
    const routePath = routeActiveTripState.orderedRoutePath;
    const routeNavigationMode = routeActiveTripState.navigationMode;
    const routeSentNotifications = routeActiveTripState.sentNotifications;
    const routeStations = routeEta.path
      .map(p => stationById.get(p.id))
      .filter((s): s is StationResult => !!s);

    async function syncActiveStation() {
      let loc;
      const locationCacheTtlMs = getLocationMemoryCacheTtlForTripStatus(tripStatus);
      try {
        loc = tripStatus === 'preview'
          ? await getLocationWithTimeout(AUTO_DETECT_MAX_DURATION_MS, { cacheTtlMs: locationCacheTtlMs })
          : await LocationService.getCurrentLocation({ cacheTtlMs: locationCacheTtlMs });
      } catch {
        if (!cancelled) {
          setCurrentStationDistanceMeters(null);
          setStationProgressState('between-stations');
          if (tripStatus === 'active') {
            setNavigationConfidenceMode('approximate');
          }
        }
        return;
      }

      if (cancelled || !loc.latitude || !loc.longitude || routeStations.length === 0) {
        setCurrentStationDistanceMeters(null);
        setStationProgressState('between-stations');
        setNavigationConfidenceMode('approximate');
        return;
      }

      setUserLat(loc.latitude);
      setUserLon(loc.longitude);
      setNavigationConfidenceMode('normal');

      const nearest = findNearestStationWithDistance(routeStations, loc.latitude, loc.longitude);
      setCurrentStationDistanceMeters(nearest?.distanceMeters ?? null);
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
        applyStartTripTracking({
          source: 'auto-gps',
          detectedStationIndex: nearestPathIndex,
        });
        return;
      }

      if (tripStatus !== 'active') {
        return;
      }

      if (!nearest || nearest.distanceMeters > HARD_MAX_STATION_MATCH_RADIUS_METERS) {
        setNavigationConfidenceMode('hybrid');
        setStationProgressState('between-stations');
        return;
      }

      if (nearestPathIndex < 0) return;
      const speedMps = loc.speedMps ?? null;

      const gpsReading: RawGpsReading = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyMeters: loc.accuracy ?? 9999,
        altitudeMeters: null,
        altitudeAccuracyMeters: null,
        headingDegrees: null,
        speedMetersPerSecond: speedMps,
        hardwareTimestampMs: Date.now(),
        provider: 'GPS',
      };
      const fused = locationFusionRef.current.fuse(
        gpsReading,
        inertialRef.current.getVerdict(),
      );
      void postFusedLocation(fused, nearestRouteStation?.lineId);

      const secondsToNearestRouteStation =
        speedMps !== null && speedMps > 0
          ? nearest.distanceMeters / speedMps
          : null;
      const stationProgress = deriveStationProgress({
        tripStatus,
        currentStationIndex: currentTrackedStationIndex,
        nearestRouteStationIndex: nearestPathIndex,
        distanceToNearestRouteStationMeters: nearest.distanceMeters,
        secondsToNearestRouteStation,
        speedMps,
      });

      setStationProgressState(stationProgress.stationProgressState);
      if (stationProgress.visualFocusedStationIndex !== null) {
        setVisualFocusedStationIndex(stationProgress.visualFocusedStationIndex);
      }

      if (
        stationProgress.stationProgressState !== 'at-station' ||
        stationProgress.confirmedStationIndex === null
      ) {
        return;
      }

      const confirmedStationIndex = stationProgress.confirmedStationIndex;
      const confirmedStation = routePath[confirmedStationIndex];
      if (!confirmedStation) return;

      activeStationIdRef.current = confirmedStation.id;
      setCurrentTrackedStationIndex(confirmedStationIndex);
      setVisualFocusedStationIndex(confirmedStationIndex);
      const locale = toLocale(language);
      let notificationTripState = buildActiveTripState({
        routeId,
        orderedRoutePath: routePath,
        currentStationIndex: confirmedStationIndex,
        navigationMode: routeNavigationMode,
        sentNotifications: routeSentNotifications,
        tripStatus,
      });

      const pendingTransferNotice = notificationTripState.transferPoints.find(
        transferPoint => shouldNotifyOneBeforeTransfer(notificationTripState, transferPoint),
      );
      if (pendingTransferNotice) {
        const noticeId = buildOneBeforeTransferNoticeId(
          notificationTripState.routeId,
          pendingTransferNotice.stationId,
        );
        const hasFired = hasActiveTripNoticeFired(activeTripCacheRef.current, noticeId);
        if (!hasFired) {
          const transferBody = `${translate('notification.transfer.prepare_body', locale)} ${pendingTransferNotice.stationName}. ${translate('navigation.take_line', locale)} ${toLineNumber(pendingTransferNotice.toLine)}${pendingTransferNotice.directionTerminal ? ` · ${translate('direction', locale)} ${pendingTransferNotice.directionTerminal}` : ''}.`;
          showTransientRouteBanner(transferBody);
          if (await ConsentService.canUseNotifications()) {
            try {
              await TripNotificationService.notifyNextStation(
                translate('notification.transfer.prepare_title', locale),
                transferBody,
              );
            } catch {
              // Falha de notificação não dispara retry automático nesta viagem.
            }
          }

          notificationTripState = markOneBeforeTransferSent(
            notificationTripState,
            pendingTransferNotice.stationId,
          );
          setSentNotifications(notificationTripState.sentNotifications);
          if (activeTripCacheRef.current) {
            activeTripCacheRef.current = markActiveTripNoticeFired(
              activeTripCacheRef.current,
              noticeId,
            );
          }
        }
      }

      if (
        shouldNotifyOneBeforeDestination(notificationTripState)
      ) {
        const noticeId = buildOneBeforeDestinationNoticeId(
          notificationTripState.routeId,
          notificationTripState.destinationStation.id,
        );
        const hasFired = hasActiveTripNoticeFired(activeTripCacheRef.current, noticeId);
        if (!hasFired) {
          const destinationBody = `${translate('notification.next_station.body', locale)} ${routeDestination.name}.`;
          showTransientRouteBanner(destinationBody);
          if (await ConsentService.canUseNotifications()) {
            try {
              await TripNotificationService.notifyNextStation(
                translate('notification.next_station.title', locale),
                destinationBody,
              );
            } catch {
              // Falha de notificação não dispara retry automático nesta viagem.
            }
          }
          notificationTripState = markOneBeforeDestinationSent(notificationTripState);
          // Marcação em finally garante execução independente de sucesso ou falha.
          // Sem retry automático dentro da mesma viagem.
          // Trade-off aceito: notificação pode ser perdida, nunca duplicada.
          setSentNotifications(notificationTripState.sentNotifications);
          if (activeTripCacheRef.current) {
            activeTripCacheRef.current = markActiveTripNoticeFired(
              activeTripCacheRef.current,
              noticeId,
            );
          }
        }
      }
    }

    syncActiveStation();
    if (tripStatus !== 'active') {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(
      syncActiveStation,
      ACTIVE_STATION_SYNC_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [screen, etaData, stationsData, destination, routeKey, language, tripStatus, currentTrackedStationIndex, activeTripState?.routeId, sentNotificationsKey]);

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

      const canUseLocation = await ConsentService.canUseLocation();
      const status = await LocationService.getPermissionStatus();
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
        setLocationMode(status === 'denied' ? 'denied' : 'manual');
        setOriginSource('empty');
        if (status === 'undetermined' && canUseLocation) {
          setTimeout(() => setShowLocationPermission(true), 500);
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
    setOriginSource('manual');
    setCurrentTrackedStationIndex(null);
    setVisualFocusedStationIndex(0);
    setStationProgressState('between-stations');
    setSelectingOrigin(false);
    if (destination) {
      setScreen('navigating');
    }
  }

  function findStationForResolvedPoi(resolvedDestination: ResolvedPoiDestination): StationResult | null {
    const normalizedStationId = normalizeStationId(resolvedDestination.routeDestinationStationId);
    const normalizedStationName = normalizeStationId(resolvedDestination.routeDestinationStationName);

    return (stationsData ?? []).find(station =>
      normalizeStationId(station.id) === normalizedStationId ||
      normalizeStationId(station.name) === normalizedStationId ||
      normalizeStationId(station.name) === normalizedStationName,
    ) ?? null;
  }

  function buildHistoryItem(
    station: StationResult,
    poiDestination?: ResolvedPoiDestination,
    addressDestination?: ResolvedAddressDestination,
    placeDestination?: ResolvedPlaceDestination,
  ): SearchHistoryItem {
    if (placeDestination) {
      return {
        ...station,
        itemType: 'place',
        displayName: placeDestination.displayName,
        placeId: placeDestination.placeId,
        routeStationName: placeDestination.routeDestinationStationName,
        routeLineIds: placeDestination.lineIds,
        routeDistanceMeters: placeDestination.distanceMeters,
        timestamp: Date.now(),
      };
    }

    if (addressDestination) {
      return {
        ...station,
        itemType: 'address',
        displayName: addressDestination.displayName,
        addressId: addressDestination.addressId,
        routeStationName: addressDestination.routeDestinationStationName,
        routeLineIds: addressDestination.lineIds,
        routeDistanceMeters: addressDestination.distanceMeters,
        timestamp: Date.now(),
      };
    }

    if (!poiDestination) {
      return {
        ...station,
        itemType: 'station',
        timestamp: Date.now(),
      };
    }

    return {
      ...station,
      itemType: 'poi',
      displayName: poiDestination.displayName,
      poiId: poiDestination.poi.id,
      routeStationName: poiDestination.routeDestinationStationName,
      routeLineIds: poiDestination.lineIds,
      timestamp: Date.now(),
    };
  }

  function getHistoryKey(item: SearchHistoryItem): string {
    if (item.itemType === 'address' && item.addressId) return `address:${item.addressId}`;
    if (item.itemType === 'place' && item.placeId) return `place:${item.placeId}`;
    return item.itemType === 'poi' && item.poiId ? `poi:${item.poiId}` : `station:${item.id}`;
  }

  function saveRouteHistory(entry: SearchHistoryItem) {
    CacheService.get<SearchHistoryItem[]>('route_history').then((hist: SearchHistoryItem[] | null) => {
      const history: SearchHistoryItem[] = hist ?? [];
      const entryKey = getHistoryKey(entry);
      const updated = [entry, ...history.filter(item => getHistoryKey(item) !== entryKey)].slice(0, 3);
      CacheService.set('route_history', updated, 30 * 24 * 60 * 60 * 1000);
    });
  }

  async function handleLocateUser() {
    if (locating) return;

    setLocating(true);
    try {
      const status = await LocationService.getPermissionStatus();
      if (status === 'undetermined') {
        setShowLocationPermission(true);
        return;
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

  async function handleAllowLocation() {
    const consent = await ConsentService.getConsent();
    await ConsentService.saveConsent(true, consent?.analytics ?? false);
    setShowLocationPermission(false);
    const status = await LocationService.requestPermission();
    if (status === 'granted') {
      await handleLocateUser();
    } else {
      setLocationMode('denied');
      setOriginSource('empty');
    }
  }

  function handleDismissLocationPermission() {
    setShowLocationPermission(false);
    setLocationMode('manual');
    setOriginSource('empty');
  }

  async function handleAllowNotifications() {
    setShowNotificationPermission(false);
    await CacheService.set('notification_permission_explainer_seen', true, 365 * 24 * 60 * 60 * 1000);
    await TripNotificationService.requestPermission();
  }

  async function handleDismissNotifications() {
    setShowNotificationPermission(false);
    await CacheService.set('notification_permission_explainer_seen', true, 365 * 24 * 60 * 60 * 1000);
  }

  function handleSelectAlternativeRoute() {
    if (!alternativeRoute) return;
    setSelectedRouteOptionId(alternativeRoute.id);
  }

  function handleSelectRecommendedRoute() {
    setSelectedRouteOptionId('recommended');
  }

  // Auto-detecta estação de origem via GPS quando estações carregam
  useEffect(() => {
    if (!stationsData || !userLat || !userLon || locationMode === 'planning' || locationMode === 'denied') return;
    if (originSource === 'manual') return;
    applyGpsOrigin({ latitude: userLat, longitude: userLon }, stationsData);
  }, [stationsData, userLat, userLon, originSource, locationMode]);

  // Quando ETA chega, vai para navegação
  useEffect(() => {
    if (etaResponse && screen === 'searching') setScreen('navigating');
  }, [etaResponse]);

  function handleDestinationSelect(
    station: StationResult,
    options?: StationSearchSelectionOptions,
  ) {
    const poiDestination = options?.poiDestination;
    const addressDestination = options?.addressDestination;
    const placeDestination = options?.placeDestination;
    setDestination(station);
    setDestinationDisplayName(
      placeDestination?.displayName ?? addressDestination?.displayName ?? poiDestination?.displayName ?? null,
    );
    setCurrentTrackedStationIndex(null);
    setVisualFocusedStationIndex(0);
    setStationProgressState('between-stations');
    saveRouteHistory(buildHistoryItem(station, poiDestination, addressDestination, placeDestination));
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
    setDestinationDisplayName(null);
    setCurrentTrackedStationIndex(null);
    setVisualFocusedStationIndex(0);
    setStationProgressState('between-stations');
    setScreen('navigating');
  }

  function handleCloseNavigation() {
    if (routeKey) TripNotificationService.endActiveTrip(routeKey).catch(() => undefined);
    activeTripCacheRef.current = null;
    if (noticeBannerTimerRef.current) {
      clearTimeout(noticeBannerTimerRef.current);
      noticeBannerTimerRef.current = null;
    }
    clearActiveTripCache().catch(() => undefined);
    setDestination(null);
    setDestinationDisplayName(null);
    setCurrentTrackedStationIndex(null);
    setVisualFocusedStationIndex(0);
    setStationProgressState('between-stations');
    applyTripStatusTransition('ended');
    setScreen('map');
  }

  function handleSidebarPoiDestinationSelect(poi: PointOfInterest) {
    const resolvedDestination = resolvePoiDestination(poi);
    const station = findStationForResolvedPoi(resolvedDestination);
    if (!station) return;

    setSidebarOpen(false);
    handleDestinationSelect(station, { poiDestination: resolvedDestination });
  }


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]} {...panResponder.panHandlers}>
      {HAS_GOOGLE_MAPS_KEY ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          customMapStyle={theme.isDark ? DARK_MAP_STYLE : []}
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
              title={`Destino: ${destinationDisplayName ?? destination.name}`}
              pinColor="#1A73E8"
            />
          )}
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapFallback, { backgroundColor: theme.colors.mapFallback }]} />
      )}
      <MapOverlay />

      <View style={[styles.searchWrapper, { top: insets.top + 12 }]}>
        <Animated.Text
          style={[
            styles.homePrompt,
            {
              color: theme.colors.textPrimary,
              opacity: promptOpacity,
              transform: [{ translateY: promptTranslateY }],
            },
          ]}
        >
          {translate('home.prompt', toLocale(language))}
        </Animated.Text>
        <SearchBar
          onMenuClick={() => setSidebarOpen(true)}
          onOriginClick={() => setSelectingOrigin(true)}
          onDestinationClick={() => setScreen('searching')}
          onSwapRoute={handleSwapRoute}
          originName={origin?.name}
          destinationName={destinationDisplayName ?? destination?.name}
          canSwap={!!origin && !!destination}
          routeGradientColors={routeGradientColors}
        />
      </View>

      {locationMode !== 'nearby' && locationMode !== 'manual' && (
        <View style={[
          styles.contextBanner,
          {
            top: insets.top + 116,
            backgroundColor: theme.isDark ? 'rgba(23,32,51,0.96)' : 'rgba(255,255,255,0.96)',
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
          },
        ]}>
          <Text style={[styles.contextTitle, { color: theme.colors.textPrimary }]}>
            {locationMode === 'loading' ? translate('location.detecting', toLocale(language)) : translate('location.plan_santiago', toLocale(language))}
          </Text>
          <Text style={[styles.contextText, { color: theme.colors.textSecondary }]}>
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

      {showAudioSafetyReminder && screen === 'navigating' && (
        <View style={[
          styles.safetyReminder,
          {
            top: insets.top + (arrivalBanner ? 178 : 116),
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.borderSubtle,
            shadowColor: theme.colors.shadow,
          },
        ]}>
          <View style={[styles.safetyReminderIcon, { backgroundColor: `${Colors.actionBlue}18` }]}>
            <Feather name="volume-2" size={15} color={Colors.actionBlue} />
          </View>
          <View style={styles.safetyReminderCopy}>
            <Text style={[styles.safetyReminderTitle, { color: theme.colors.textPrimary }]}>
              {translate('safety.audio.title', locale)}
            </Text>
            <Text style={[styles.safetyReminderText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {translate('safety.audio.body', locale)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.safetyReminderButton, { borderColor: theme.colors.border }]}
            onPress={() => { void handleDismissAudioSafetyReminder(); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.safetyReminderButtonText, { color: Colors.actionBlue }]}>
              {translate('common.understood', locale)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        accessibilityLabel="Centralizar no usuario"
        activeOpacity={0.82}
        disabled={locating}
        onPress={handleLocateUser}
        style={[
          styles.locationButton,
          {
            top: insets.top + (locationMode === 'planning' || locationMode === 'denied' || locationMode === 'loading' ? 176 : 116),
            backgroundColor: theme.colors.surfaceElevated,
            shadowColor: theme.colors.shadow,
          },
          locating && styles.locationButtonDisabled,
        ]}
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
        onSelectPoiDestination={handleSidebarPoiDestinationSelect}
      />

      {/* NavigationProgress como overlay — mapa continua vivo */}
      {screen === 'navigating' && destination && (
        <NavigationProgress
          origin={origin?.name ?? 'Origen'}
          destination={destinationDisplayName ?? destination.name}
          estimatedTime={etaData ? formatMinutes(etaData.timing.totalEstimatedSeconds) : etaLoading ? '...' : '--'}
          arrivalTime={etaData ? formatArrival(etaData.arrivalTime) : '--:--'}
          stations={stations}
          currentLine={toLineNumber(activeTripState?.currentLine ?? etaData?.linesOnRoute?.[0])}
          currentDirection={currentDirection}
          navigationConfidenceLabel={navigationConfidenceLabel}
          navigationConfidenceColor={navigationConfidenceColor}
          tripStatus={tripStatus}
          stationProgressState={stationProgressState}
          currentStationDistanceMeters={currentStationDistanceMeters}
          tripProgress={tripProgress}
          originAccess={originAccess}
          destinationAccess={destinationAccess}
          timelineNotice={timelineNotice}
          alternativeRoute={selectedRouteOptionId === 'recommended' ? alternativeRoute : null}
          showingAlternative={selectedRouteOptionId !== 'recommended'}
          onSelectAlternative={handleSelectAlternativeRoute}
          onSelectRecommended={handleSelectRecommendedRoute}
          onClose={handleCloseNavigation}
        />
      )}
      <PermissionExplainerModal
        visible={showLocationPermission}
        kind="location"
        onDismiss={handleDismissLocationPermission}
        onAllow={handleAllowLocation}
        onOpenPrivacy={() => {
          setShowLocationPermission(false);
          router.push('/privacy-policy');
        }}
      />
      <PermissionExplainerModal
        visible={showNotificationPermission}
        kind="notifications"
        onDismiss={handleDismissNotifications}
        onAllow={handleAllowNotifications}
        onOpenPrivacy={() => {
          setShowNotificationPermission(false);
          router.push('/privacy-policy');
        }}
      />
      <StationSearchModal
        visible={selectingOrigin}
        onClose={() => setSelectingOrigin(false)}
        onSelect={handleOriginSelect}
        titleKey="search.origin_title"
        nearbyStations={nearbyStations}
        selectedStation={origin}
        selectedStationHintKey={originSource === 'gps-nearest-station' ? 'search.nearest_station' : undefined}
        enablePoiSearch={false}
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
  safetyReminder: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  safetyReminderIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyReminderCopy: { flex: 1 },
  safetyReminderTitle: { fontSize: 12, fontWeight: '900' },
  safetyReminderText: { marginTop: 2, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  safetyReminderButton: {
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyReminderButtonText: { fontSize: 11, fontWeight: '900' },
  searchWrapper: { position: 'absolute', left: 16, right: 16 },
  homePrompt: {
    marginBottom: 7,
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(255,255,255,0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
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
