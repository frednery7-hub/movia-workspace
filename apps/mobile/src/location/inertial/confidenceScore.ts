import type { InertialTripInput } from './types';

export const INERTIAL_VISUAL_ADVANCE_CONFIDENCE = 0.7;
export const INERTIAL_STATION_CONFIRM_CONFIDENCE = 0.85;
export const RELIABLE_GPS_ACCURACY_METERS = 50;

export function calculateInertialOnlyConfidence(
  input: InertialTripInput,
): number {
  let score = 0;
  const hasExpectedSegmentTime =
    typeof input.expectedSecondsToNextStation === 'number' &&
    input.expectedSecondsToNextStation > 0;

  if (
    hasExpectedSegmentTime &&
    input.secondsSinceLastConfirmedStation >=
      input.expectedSecondsToNextStation! * 0.9
  ) {
    score += 0.5;
  }

  if (input.motionState === 'stationary') {
    score += 0.3;
  }

  if (input.motionState === 'braking') {
    score += 0.1;
  }

  if (input.hasSustainedArrivalWindow) {
    score += 0.1;
  }

  return Math.min(score, 1);
}

export function isReliableGps(input: InertialTripInput): boolean {
  return (
    input.gpsAvailable === true &&
    typeof input.gpsAccuracyMeters === 'number' &&
    input.gpsAccuracyMeters <= RELIABLE_GPS_ACCURACY_METERS
  );
}
