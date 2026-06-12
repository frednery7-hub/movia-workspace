import { getLineDirectionByStationId } from '@movia/shared-data/metro/line-directions';
import type { MetroLineId } from '@movia/shared-data/metro/line-directions';
import {
  getExpressRouteState,
  type ExpressRouteHolidayOptions,
  type ExpressRouteState,
} from '../data/expressRoute';

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
  stationArrivalStationIds: string[];
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
  expressRoute: ExpressRouteState | null;
};

export type BuildActiveTripStateInput = {
  routeId: string;
  orderedRoutePath: RouteStation[];
  tripStatus: TripStatus;
  currentStationIndex: number | null;
  navigationMode: NavigationMode;
  sentNotifications?: Partial<SentTripNotifications>;
  expressRouteDate?: Date;
  expressRouteHolidayOptions?: ExpressRouteHolidayOptions;
};

export const EMPTY_SENT_TRIP_NOTIFICATIONS: SentTripNotifications = {
  stationArrivalStationIds: [],
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
      transferPoints,
    ),
    transferPoints,
    navigationMode: input.navigationMode,
    sentNotifications: {
      ...EMPTY_SENT_TRIP_NOTIFICATIONS,
      ...input.sentNotifications,
    },
    expressRoute: currentStation
      ? getExpressRouteState(
        currentLine,
        currentStation.name,
        input.expressRouteDate,
        input.expressRouteHolidayOptions,
      )
      : null,
  };
}

export function shouldTransitionToArrived(
  state: {
    tripStatus: TripStatus;
    currentStationIndex: number | null;
    orderedRoutePath: readonly unknown[];
  },
): boolean {
  return (
    state.tripStatus === 'active' &&
    state.currentStationIndex === state.orderedRoutePath.length - 1
  );
}

export function transitionTripStatus<TState extends { tripStatus: TripStatus }>(
  state: TState,
  nextStatus: TripStatus,
): TState {
  if (!canTransitionTripStatus(state.tripStatus, nextStatus)) return state;

  return {
    ...state,
    tripStatus: nextStatus,
  };
}

function canTransitionTripStatus(
  currentStatus: TripStatus,
  nextStatus: TripStatus,
): boolean {
  if (currentStatus === nextStatus) return true;
  if (nextStatus === 'preview') return true;

  switch (currentStatus) {
    case 'preview':
      return nextStatus === 'active' || nextStatus === 'ended';
    case 'active':
      return nextStatus === 'arrived' || nextStatus === 'ended';
    case 'arrived':
      return nextStatus === 'ended';
    case 'ended':
      return false;
  }
}

export function shouldNotifyStationArrival(state: ActiveTripState): boolean {
  return (
    state.tripStatus !== 'preview' &&
    state.tripStatus !== 'ended' &&
    state.currentStationIndex !== null &&
    state.currentStationIndex > 0 &&
    state.currentStation !== null &&
    !state.sentNotifications.stationArrivalStationIds.includes(
      state.currentStation.id,
    )
  );
}

export function shouldNotifyOneBeforeTransfer(
  state: ActiveTripState,
  transferPoint: TransferPoint,
): boolean {
  return (
    state.tripStatus === 'active' &&
    state.currentStationIndex === transferPoint.index - 1 &&
    !state.sentNotifications.oneBeforeTransferStationIds.includes(
      transferPoint.stationId,
    )
  );
}

export function shouldNotifyAtTransfer(
  state: ActiveTripState,
  transferPoint: TransferPoint,
): boolean {
  return (
    state.tripStatus === 'active' &&
    state.currentStationIndex === transferPoint.index &&
    !state.sentNotifications.atTransferStationIds.includes(
      transferPoint.stationId,
    )
  );
}

export function shouldNotifyOneBeforeDestination(
  state: ActiveTripState,
): boolean {
  return (
    state.tripStatus === 'active' &&
    state.currentStationIndex === state.orderedRoutePath.length - 2 &&
    !state.sentNotifications.oneBeforeDestinationSent
  );
}

export function shouldNotifyDestinationArrival(
  state: ActiveTripState,
): boolean {
  return (
    shouldTransitionToArrived(state) &&
    !state.sentNotifications.destinationArrivalSent
  );
}

export function markStationArrivalSent(
  state: ActiveTripState,
  stationId: string,
): ActiveTripState {
  if (state.sentNotifications.stationArrivalStationIds.includes(stationId)) {
    return state;
  }

  return {
    ...state,
    sentNotifications: {
      ...state.sentNotifications,
      stationArrivalStationIds: [
        ...state.sentNotifications.stationArrivalStationIds,
        stationId,
      ],
    },
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
    const isSameStationTransfer = station.id === nextStation.id;
    const directionCurrentStationId = isSameStationTransfer
      ? nextStation.id
      : station.id;
    const directionNextStation =
      isSameStationTransfer ? path[index + 2] : nextStation;

    const directionTerminal =
      directionNextStation
        ? getLineDirectionByStationId({
          lineId: nextStation.lineId,
          currentStationId: directionCurrentStationId,
          nextStationId: directionNextStation.id,
        })?.directionTerminal ?? null
        : null;

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
  transferPoints: TransferPoint[],
): string | null {
  const index = currentStationIndex ?? 0;
  const transferPoint = transferPoints.find((point) => point.index === index);
  if (transferPoint) return transferPoint.directionTerminal;

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
