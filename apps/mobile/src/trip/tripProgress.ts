import type { NavigationMode, TripStatus } from './activeTripState';

export type ActiveTripProgressMode = 'estimated' | 'gps' | 'hybrid';

export type ActiveTripProgress = {
  routeId: string;
  currentLegIndex: number;
  currentSegmentIndex: number;
  currentStationId?: string;
  nextStationId?: string;
  completedStationIds: string[];
  totalStations: number;
  totalSegments: number;
  progressPercent: number;
  segmentProgressPercent: number;
  remainingStations: number;
  estimatedArrivalTime?: string;
  mode: ActiveTripProgressMode;
};

export type TripTimelineNotice =
  | { type: 'arrived' }
  | { type: 'before-destination' }
  | { type: 'transfer'; stationName: string }
  | { type: 'next'; stationName: string; remainingStations: number }
  | { type: 'remaining'; count: number };

export function getTripTimelineNotice(params: {
  tripStatus: TripStatus;
  remainingStations: number;
  nextStationName?: string;
  nextTransferStationName?: string;
}): TripTimelineNotice | null {
  if (params.tripStatus === 'arrived') return { type: 'arrived' };
  if (params.tripStatus !== 'active') return null;
  if (params.remainingStations === 2) return { type: 'before-destination' };
  if (params.nextTransferStationName) {
    return { type: 'transfer', stationName: params.nextTransferStationName };
  }
  if (params.nextStationName) {
    return {
      type: 'next',
      stationName: params.nextStationName,
      remainingStations: params.remainingStations,
    };
  }
  if (params.remainingStations > 0) {
    return { type: 'remaining', count: params.remainingStations };
  }
  return null;
}

export function buildActiveTripProgress(params: {
  routeId: string;
  stationIds: string[];
  tripStatus: TripStatus;
  currentStationIndex: number | null;
  elapsedSeconds: number;
  totalEstimatedSeconds: number;
  navigationMode: NavigationMode;
  estimatedArrivalTime?: string;
}): ActiveTripProgress {
  const totalStations = params.stationIds.length;
  const totalSegments = Math.max(0, totalStations - 1);
  const confirmedIndex = params.currentStationIndex;
  const gpsProgress = totalSegments === 0
    ? 1
    : (confirmedIndex ?? 0) / totalSegments;
  const timeProgress = params.totalEstimatedSeconds > 0
    ? Math.min(1, Math.max(0, params.elapsedSeconds / params.totalEstimatedSeconds))
    : 0;
  const mode: ActiveTripProgressMode = params.navigationMode === 'normal'
    ? 'hybrid'
    : params.navigationMode === 'offline' ? 'estimated' : 'hybrid';
  const normalizedProgress = params.tripStatus === 'arrived' || params.tripStatus === 'ended'
    ? 1
    : params.tripStatus === 'preview'
      ? 0
      : mode === 'estimated'
        ? timeProgress
        : Math.max(gpsProgress, (gpsProgress * 0.65) + (timeProgress * 0.35));
  const progressPercent = Math.round(Math.min(1, normalizedProgress) * 100);
  const segmentFloat = normalizedProgress * Math.max(totalSegments, 1);
  const currentSegmentIndex = Math.min(
    Math.max(0, Math.floor(segmentFloat)),
    Math.max(0, totalSegments - 1),
  );
  const segmentProgressPercent = progressPercent >= 100
    ? 100
    : Math.round((segmentFloat - Math.floor(segmentFloat)) * 100);
  const estimatedCompletedCount = params.tripStatus === 'preview'
    ? 0
    : Math.min(totalStations, Math.floor(segmentFloat) + 1);
  const confirmedCompletedCount = confirmedIndex === null ? 0 : confirmedIndex + 1;
  const completedCount = params.tripStatus === 'arrived' || params.tripStatus === 'ended'
    ? totalStations
    : Math.max(confirmedCompletedCount, estimatedCompletedCount);
  const nextStationIndex = Math.min(currentSegmentIndex + 1, totalStations - 1);

  return {
    routeId: params.routeId,
    currentLegIndex: 0,
    currentSegmentIndex,
    currentStationId: confirmedIndex === null ? undefined : params.stationIds[confirmedIndex],
    nextStationId: params.stationIds[nextStationIndex],
    completedStationIds: params.stationIds.slice(0, completedCount),
    totalStations,
    totalSegments,
    progressPercent,
    segmentProgressPercent,
    remainingStations: Math.max(0, totalStations - completedCount),
    estimatedArrivalTime: params.estimatedArrivalTime,
    mode,
  };
}
