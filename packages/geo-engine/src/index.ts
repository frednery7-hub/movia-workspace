export { GeoEngine, GeoEngineError } from "./geo-engine.ts";
export {
  applySpeedGate,
  MAX_PHYSICAL_SPEED_MS,
  ANCHOR_RESET_THRESHOLD,
} from "./speed-gate.ts";
export { haversineMeters } from "./haversine.ts";
export { LinearSpatialIndex, GridSpatialIndex } from "./spatial-index.ts";
export type {
  SpatialIndex,
  StationRecord,
  EntranceRecord,
} from "./spatial-index.ts";
export {
  computeConfidenceScore,
  NAVIGATION_THRESHOLDS,
  QUALITY_POLICIES,
} from "./confidence-score.ts";
export type {
  ConfidenceInput,
  ConfidenceOutput,
  NavigationMode,
  ScoreBreakdown,
} from "./confidence-score.ts";
export { NavigationStateMachine, RECOVERY_THRESHOLD } from "./state-machine.ts";
export type { StateMachineInput, StateMachineOutput } from "./state-machine.ts";
