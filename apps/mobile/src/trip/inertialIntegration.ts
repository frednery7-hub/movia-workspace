import { classifyMotionState } from '../location/inertial/motionClassifier';
import { estimateTripProgress } from '../location/inertial/inertialTripEngine';
import {
  hasSustainedArrivalWindow,
  type MotionStateSample,
} from '../location/inertial/sustainedArrivalWindow';
import type {
  InertialTripDecision,
  MotionState,
  TripEstimationMode,
} from '../location/inertial/types';
import type { NavigationMode, TripStatus } from './activeTripState';

/**
 * TEMPORARIO: valor medio fixo ate o backend expor averageDurationSeconds
 * por segmento da rota ativa. Nao usar como fonte de verdade definitiva.
 */
export const FALLBACK_EXPECTED_SECONDS_TO_NEXT_STATION = 90;

export const MOTION_SAMPLE_BUFFER_RETENTION_MS = 10_000;

export function mapTripEstimationModeToNavigationMode(
  mode: TripEstimationMode,
): NavigationMode {
  switch (mode) {
    case 'normal':
      return 'normal';
    case 'hybrid':
      return 'hybrid';
    case 'inertial':
      return 'inertial';
    case 'uncertain':
      return 'approximate';
  }
}

export function pruneMotionSampleBuffer(
  buffer: MotionStateSample[],
  now: number = Date.now(),
): MotionStateSample[] {
  return buffer.filter(
    (sample) => now - sample.timestamp <= MOTION_SAMPLE_BUFFER_RETENTION_MS,
  );
}

export type InertialFallbackInput = {
  tripStatus: TripStatus;
  currentStationIndex: number | null;
  destinationStationIndex: number;
  routeStationCount: number;
  gpsAvailable: boolean;
  gpsAccuracyMeters?: number | null;
  distanceToNextStationMeters?: number | null;
  speedMps?: number | null;
  previousSpeedMps?: number | null;
  isStationaryFromAccelerometer?: boolean | null;
  motionSampleBuffer: MotionStateSample[];
  secondsSinceLastConfirmedStation: number;
  now?: number;
};

export type InertialFallbackResult = {
  decision: InertialTripDecision;
  navigationMode: NavigationMode;
  motionState: MotionState;
  updatedBuffer: MotionStateSample[];
};

export function computeInertialFallback(
  input: InertialFallbackInput,
): InertialFallbackResult {
  const now = input.now ?? Date.now();

  const motionState = classifyMotionState({
    isStationary: input.isStationaryFromAccelerometer,
    speedMps: input.speedMps,
    previousSpeedMps: input.previousSpeedMps,
  });

  const prunedBuffer = pruneMotionSampleBuffer(input.motionSampleBuffer, now);
  const updatedBuffer = [...prunedBuffer, { timestamp: now, motionState }];
  const sustained = hasSustainedArrivalWindow(updatedBuffer);

  const decision = estimateTripProgress({
    tripStatus: input.tripStatus,
    currentStationIndex: input.currentStationIndex,
    destinationStationIndex: input.destinationStationIndex,
    routeStationCount: input.routeStationCount,
    distanceToNextStationMeters: input.distanceToNextStationMeters ?? null,
    gpsAvailable: input.gpsAvailable,
    gpsAccuracyMeters: input.gpsAccuracyMeters ?? null,
    speedMps: input.speedMps ?? null,
    secondsSinceLastConfirmedStation: input.secondsSinceLastConfirmedStation,
    expectedSecondsToNextStation: FALLBACK_EXPECTED_SECONDS_TO_NEXT_STATION,
    motionState,
    hasSustainedArrivalWindow: sustained,
  });

  return {
    decision,
    navigationMode: mapTripEstimationModeToNavigationMode(decision.mode),
    motionState,
    updatedBuffer,
  };
}
