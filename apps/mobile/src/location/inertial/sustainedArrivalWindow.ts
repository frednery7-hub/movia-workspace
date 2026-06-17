import type { MotionState } from './types';

export type MotionStateSample = {
  timestamp: number;
  motionState: MotionState;
};

export const SUSTAINED_STATIONARY_SAMPLE_COUNT = 3;
export const SUSTAINED_STATIONARY_DURATION_MS = 5_000;

export function hasSustainedArrivalWindow(
  samples: MotionStateSample[],
): boolean {
  // Samples must be chronological ascending; the newest reading is last.
  const reversed = [...samples].reverse();
  const consecutiveStationary: MotionStateSample[] = [];

  for (const sample of reversed) {
    if (sample.motionState !== 'stationary') break;
    consecutiveStationary.push(sample);
  }

  if (consecutiveStationary.length >= SUSTAINED_STATIONARY_SAMPLE_COUNT) {
    return true;
  }

  if (consecutiveStationary.length < 2) return false;

  const newest = consecutiveStationary[0];
  const oldest = consecutiveStationary[consecutiveStationary.length - 1];
  return newest.timestamp - oldest.timestamp >= SUSTAINED_STATIONARY_DURATION_MS;
}
