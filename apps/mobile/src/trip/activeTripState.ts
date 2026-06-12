import { getLineDirectionByStationId } from '@movia/shared-data/metro/line-directions';
import type { MetroLineId } from '@movia/shared-data/metro/line-directions';

export type TripStatus = 'preview' | 'active' | 'arrived' | 'ended';

export type NavigationMode =
  | 'normal'
  | 'gps-unstable'
  | 'hybrid'
  | 'approximate'
  | 'offline';

export type RouteStation = {
  id: string;
  name: string;
  lineId: MetroLineId;
  latitude: number;
  longitude: number;
};

export type TransferPoint = {
  index: number;
  stationId: string;
  stationName: string;
  fromLine: MetroLineId;
  toLine: MetroLineId;
  directionTerminal: string | null;
};

export type SentTripNotifications = {
  oneBeforeTransferStationIds: string[];
  atTransferStationIds: string[];
  oneBeforeDestinationSent: boolean;
  destinationArrivalSent: boolean;
};

export type ActiveTripState = {
  routeId: string;
  tripStatus: TripStatus;
  orderedRoutePath: RouteStation[];
  originStation: RouteStation;
  destinationStation: RouteStation;
  currentStationIndex: number | null;
  previousStation: RouteStation | null;
  currentStation: RouteStation | null;
  nextStation: RouteStation | null;
  currentLine: MetroLineId;
  nextLine: MetroLineId | null;
  directionTerminal: string | null;
  transferPoints: TransferPoint[];
  navigationMode: NavigationMode;
  sentNotifications: SentTripNotifications;
};

export type BuildActiveTripStateInput = {
  routeId: string;
  orderedRoutePath: RouteStation[];
  tripStatus: TripStatus;
  currentStationIndex: number | null;
  navigationMode: NavigationMode;
  sentNotifications?: Partial<SentTripNotifications>;
};

export const EMPTY_SENT_TRIP_NOTIFICATIONS: SentTripNotifications = {
  oneBeforeTransferStationIds: [],
  atTransferStationIds: [],
  oneBeforeDestinationSent: false,
  destinationArrivalSent: false,
};

export const TRIP_RECOVERY_WINDOW_MS = 10 * 60 * 1000;

export function buildActiveTripState(
  input: BuildActiveTripStateInput,
): ActiveTripState {
  const orderedRoutePath = input.orderedRoutePath;
  if (orderedRoutePath.length === 0) {
    throw new Error('buildActiveTripState: orderedRoutePath cannot be empty');
  }

  const currentStationIndex = normalizeCurrentStationIndex(
    input.currentStationIndex,
    orderedRoutePath.length,
  );
  const originStation = orderedRoutePath[0];
  const destinationStation = orderedRoutePath[orderedRoutePath.length - 1];
  const previousStation =
    currentStationIndex !== null && currentStationIndex > 0
      ? orderedRoutePath[currentStationIndex - 1]
      : null;
  const currentStation =
    currentStationIndex !== null ? orderedRoutePath[currentStationIndex] : null;
  const nextStation =
    currentStationIndex === null
      ? orderedRoutePath[0] ?? null
      : orderedRoutePath[currentStationIndex + 1] ?? null;
  const currentLine = currentStation?.lineId ?? originStation.lineId;
  const transferPoints = buildTransferPoints(orderedRoutePath);

  return {
    routeId: input.routeId,
    tripStatus: input.tripStatus,
    orderedRoutePath,
    originStation,
    destinationStation,
    currentStationIndex,
    previousStation,
    currentStation,
    nextStation,
    currentLine,
    nextLine: deriveNextLine(transferPoints, currentStationIndex),
    directionTerminal: deriveDirectionTerminal(
      orderedRoutePath,
      currentStationIndex,
      currentLine,
    ),
    transferPoints,
    navigationMode: input.navigationMode,
    sentNotifications: {
      ...EMPTY_SENT_TRIP_NOTIFICATIONS,
      ...input.sentNotifications,
    },
  };
}

export function shouldTransitionToArrived(state: ActiveTripState): boolean {
  return (
    state.tripStatus === 'active' &&
    state.currentStationIndex === state.orderedRoutePath.length - 1
  );
}

export function transitionTripStatus(
  state: ActiveTripState,
  nextStatus: TripStatus,
): ActiveTripState {
  return {
    ...state,
    tripStatus: nextStatus,
  };
}

export function markOneBeforeTransferSent(
  state: ActiveTripState,
  stationId: string,
): ActiveTripState {
  if (state.sentNotifications.oneBeforeTransferStationIds.includes(stationId)) {
    return state;
  }

  return {
    ...state,
    sentNotifications: {
      ...state.sentNotifications,
      oneBeforeTransferStationIds: [
        ...state.sentNotifications.oneBeforeTransferStationIds,
        stationId,
      ],
    },
  };
}

export function markAtTransferSent(
  state: ActiveTripState,
  stationId: string,
): ActiveTripState {
  if (state.sentNotifications.atTransferStationIds.includes(stationId)) {
    return state;
  }

  return {
    ...state,
    sentNotifications: {
      ...state.sentNotifications,
      atTransferStationIds: [
        ...state.sentNotifications.atTransferStationIds,
        stationId,
      ],
    },
  };
}

export function markOneBeforeDestinationSent(
  state: ActiveTripState,
): ActiveTripState {
  if (state.sentNotifications.oneBeforeDestinationSent) return state;

  return {
    ...state,
    sentNotifications: {
      ...state.sentNotifications,
      oneBeforeDestinationSent: true,
    },
  };
}

export function markDestinationArrivalSent(
  state: ActiveTripState,
): ActiveTripState {
  if (state.sentNotifications.destinationArrivalSent) return state;

  return {
    ...state,
    sentNotifications: {
      ...state.sentNotifications,
      destinationArrivalSent: true,
    },
  };
}

function buildTransferPoints(path: RouteStation[]): TransferPoint[] {
  return path.flatMap((station, index) => {
    const nextStation = path[index + 1];
    if (!nextStation || station.lineId === nextStation.lineId) return [];

    const directionTerminal =
      getLineDirectionByStationId({
        lineId: nextStation.lineId,
        currentStationId: station.id,
        nextStationId: nextStation.id,
      })?.directionTerminal ?? null;

    return [
      {
        index,
        stationId: station.id,
        stationName: station.name,
        fromLine: station.lineId,
        toLine: nextStation.lineId,
        directionTerminal,
      },
    ];
  });
}

function deriveNextLine(
  transferPoints: TransferPoint[],
  currentStationIndex: number | null,
): MetroLineId | null {
  const cursor = currentStationIndex ?? -1;
  return (
    transferPoints.find((transferPoint) => transferPoint.index >= cursor)
      ?.toLine ?? null
  );
}

function deriveDirectionTerminal(
  path: RouteStation[],
  currentStationIndex: number | null,
  currentLine: MetroLineId,
): string | null {
  const index = currentStationIndex ?? 0;
  const currentStation = path[index];
  const nextStation = path[index + 1];
  if (!currentStation || !nextStation) return null;

  return (
    getLineDirectionByStationId({
      lineId: currentLine,
      currentStationId: currentStation.id,
      nextStationId: nextStation.id,
    })?.directionTerminal ?? null
  );
}

function normalizeCurrentStationIndex(
  index: number | null,
  pathLength: number,
): number | null {
  if (index === null) return null;
  if (!Number.isInteger(index)) return null;
  if (index < 0 || index >= pathLength) return null;
  return index;
}
