export type TripEstimationMode =
  | 'normal'
  | 'hybrid'
  | 'inertial'
  | 'uncertain';

export type MotionState =
  | 'unknown'
  | 'stationary'
  | 'moving'
  | 'braking'
  | 'accelerating';

export type InertialTripInput = {
  tripStatus: 'preview' | 'active' | 'arrived' | 'ended';
  currentStationIndex: number | null;
  destinationStationIndex: number;
  routeStationCount: number;
  distanceToCurrentStationMeters?: number | null;
  distanceToNextStationMeters?: number | null;
  gpsAvailable: boolean;
  gpsAccuracyMeters?: number | null;
  speedMps?: number | null;
  secondsSinceLastConfirmedStation: number;
  expectedSecondsToNextStation?: number | null;
  motionState: MotionState;
  /**
   * True only when arrival-like conditions have been sustained,
   * not from a single noisy sample.
   */
  hasSustainedArrivalWindow: boolean;
};

export type InertialTripDecision = {
  mode: TripEstimationMode;
  estimatedStationIndex: number | null;
  nextStationIndex: number | null;
  shouldAdvanceVisualState: boolean;
  shouldConfirmStation: boolean;
  confidence: number;
  reason: string;
};
