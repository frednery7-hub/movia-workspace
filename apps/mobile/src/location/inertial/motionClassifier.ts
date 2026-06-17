import type { MotionState } from './types';

export function classifyMotionState(params: {
  isStationary?: boolean | null;
  speedMps?: number | null;
  previousSpeedMps?: number | null;
}): MotionState {
  if (params.isStationary === true) return 'stationary';

  if (
    typeof params.speedMps !== 'number' ||
    typeof params.previousSpeedMps !== 'number'
  ) {
    return params.speedMps && params.speedMps > 1 ? 'moving' : 'unknown';
  }

  const delta = params.speedMps - params.previousSpeedMps;
  if (params.speedMps <= 1) return 'stationary';
  if (delta <= -0.8) return 'braking';
  if (delta >= 0.8) return 'accelerating';
  return 'moving';
}
