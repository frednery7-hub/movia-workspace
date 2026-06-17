import {
  INERTIAL_STATION_CONFIRM_CONFIDENCE,
  INERTIAL_VISUAL_ADVANCE_CONFIDENCE,
  calculateInertialOnlyConfidence,
  isReliableGps,
} from './confidenceScore';
import type { InertialTripDecision, InertialTripInput, MotionState } from './types';

export const STATION_DEPARTURE_GRACE_SECONDS = 10;

export function estimateTripProgress(
  input: InertialTripInput,
): InertialTripDecision {
  if (input.tripStatus !== 'active') {
    return {
      mode: 'uncertain',
      estimatedStationIndex: input.currentStationIndex,
      nextStationIndex: null,
      shouldAdvanceVisualState: false,
      shouldConfirmStation: false,
      confidence: 0,
      reason: 'trip-not-active',
    };
  }

  if (input.currentStationIndex === null) {
    return {
      mode: 'uncertain',
      estimatedStationIndex: null,
      nextStationIndex: null,
      shouldAdvanceVisualState: false,
      shouldConfirmStation: false,
      confidence: 0,
      reason: 'missing-current-station-index',
    };
  }

  const nextStationIndex = Math.min(
    input.currentStationIndex + 1,
    input.destinationStationIndex,
    input.routeStationCount - 1,
  );
  const gpsReliable = isReliableGps(input);
  const inertialConfidence = calculateInertialOnlyConfidence(input);

  if (gpsReliable) {
    const nearNextStation =
      typeof input.distanceToNextStationMeters === 'number' &&
      input.distanceToNextStationMeters <= 50;
    const stoppedBySpeed =
      typeof input.speedMps === 'number' && input.speedMps <= 1;
    const stoppedWithoutSpeed =
      input.speedMps === null &&
      input.hasSustainedArrivalWindow &&
      inertialConfidence >= INERTIAL_STATION_CONFIRM_CONFIDENCE;
    const stopped = stoppedBySpeed || stoppedWithoutSpeed;

    if (nearNextStation && stopped) {
      return {
        mode: 'normal',
        estimatedStationIndex: nextStationIndex,
        nextStationIndex,
        shouldAdvanceVisualState: true,
        shouldConfirmStation: true,
        confidence: 1,
        reason: 'gps-reliable-arrival-confirmed',
      };
    }

    const approaching =
      typeof input.distanceToNextStationMeters === 'number' &&
      input.distanceToNextStationMeters <= 150;

    return {
      mode: 'normal',
      estimatedStationIndex: input.currentStationIndex,
      nextStationIndex,
      shouldAdvanceVisualState: approaching,
      shouldConfirmStation: false,
      confidence: approaching ? 0.75 : 0.6,
      reason: approaching
        ? 'gps-reliable-approaching-next-station'
        : 'gps-reliable-between-stations',
    };
  }

  const shouldAdvanceVisualState =
    inertialConfidence >= INERTIAL_VISUAL_ADVANCE_CONFIDENCE;
  const shouldConfirmStation =
    inertialConfidence >= INERTIAL_STATION_CONFIRM_CONFIDENCE &&
    input.motionState === 'stationary' &&
    input.hasSustainedArrivalWindow === true;

  return {
    mode: inertialConfidence >= 0.4 ? 'inertial' : 'uncertain',
    estimatedStationIndex: shouldConfirmStation
      ? nextStationIndex
      : input.currentStationIndex,
    nextStationIndex,
    shouldAdvanceVisualState,
    shouldConfirmStation,
    confidence: inertialConfidence,
    reason: shouldConfirmStation
      ? 'inertial-arrival-confirmed'
      : shouldAdvanceVisualState
        ? 'inertial-approaching-next-station'
        : 'inertial-confidence-too-low',
  };
}

export function shouldReturnToBetweenStationsAfterDeparture(params: {
  stationProgressState: 'between-stations' | 'approaching-next-station' | 'at-station';
  motionState: MotionState;
  secondsSinceLastConfirmedStation: number;
  distanceToCurrentStationMeters?: number | null;
}): boolean {
  if (params.stationProgressState !== 'at-station') return false;
  if (params.secondsSinceLastConfirmedStation <= STATION_DEPARTURE_GRACE_SECONDS) {
    return false;
  }

  const isDeparting =
    params.motionState === 'moving' || params.motionState === 'accelerating';
  if (!isDeparting) return false;

  return (
    params.distanceToCurrentStationMeters === null ||
    params.distanceToCurrentStationMeters === undefined ||
    params.distanceToCurrentStationMeters > 50
  );
}
