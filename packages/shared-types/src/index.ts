export type Direction = "INBOUND" | "OUTBOUND" | "CIRCULAR";
export type EdgeType = "TRACK" | "TRANSFER" | "WALK";
export type RoutingStrategy =
  | "FASTEST"
  | "FEWEST_TRANSFERS"
  | "ACCESSIBLE"
  | "LOW_CONGESTION"
  | "MIN_WALKING";
export type LineStatus = "NORMAL" | "DELAYED" | "PARTIAL" | "SUSPENDED";
export type DeltaSource = "GTFS-RT" | "MANUAL" | "USER_REPORT";
export interface Line {
  id: string;
  name: string;
  color: string;
}
export interface StationEntrance {
  id: string;
  stationId: string;
  latitude: number;
  longitude: number;
  accessible: boolean;
}
export interface Station {
  id: string;
  name: string;
  shortCode: string;
  latitude: number;
  longitude: number;
  isUnderground: boolean;
  hasElevator: boolean;
  hasEscalator: boolean;
  wheelchairAccessible: boolean;
  entrances: StationEntrance[];
}
export interface Platform {
  id: string;
  stationId: string;
  lineId: string;
}
export interface SegmentTimeProfile {
  id: string;
  segmentId: string;
  serviceId: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
}
export interface TrackSegmentData {
  id: string;
  fromPlatformId: string;
  toPlatformId: string;
  lineId: string;
  direction: Direction;
  sequence: number;
  distanceMeters: number;
  averageDurationSeconds: number;
  timeProfiles: SegmentTimeProfile[];
}
export interface InternalTransferData {
  id: string;
  fromPlatformId: string;
  toPlatformId: string;
  walkingSeconds: number;
  accessibilityFriendly: boolean;
  platformChange: boolean;
}
export interface GraphNode {
  id: string;
  stationId: string;
  lineId: string;
  latitude: number;
  longitude: number;
  accessible: boolean;
}
interface BaseGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  cost: number;
  accessible: boolean;
  type: EdgeType;
}
export interface TrackEdge extends BaseGraphEdge {
  type: "TRACK";
  lineId: string;
  direction: Direction;
  distanceMeters: number;
  sequence: number;
  timeProfiles: SegmentTimeProfile[];
}
export interface TransferEdge extends BaseGraphEdge {
  type: "TRANSFER";
  walkingSeconds: number;
  platformChange: boolean;
}
export interface WalkEdge extends BaseGraphEdge {
  type: "WALK";
  distanceMeters: number;
  durationSeconds: number;
}
export type GraphEdge = TrackEdge | TransferEdge | WalkEdge;
export interface WeightedGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
  version: string;
}
export interface TransitTopology {
  lines: Line[];
  stations: Station[];
  platforms: Platform[];
  segments: TrackSegmentData[];
  transfers: InternalTransferData[];
}
export interface LineStatusUpdate {
  lineId: string;
  status: LineStatus;
  delaySeconds: number;
  affectedStations: string[];
}
export interface NetworkStateDelta {
  schemaVersion: number;
  generatedAt: Date;
  lineStatuses: LineStatusUpdate[];
  elevatorOutages: string[];
  suspendedSegments: string[];
  validUntil: Date;
  source: DeltaSource;
}
export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface RouteRequest {
  origin: Coordinates;
  destination: Coordinates;
  strategy: RoutingStrategy;
  departureTime?: Date;
  accessibleOnly?: boolean;
}
export interface RouteSegment {
  edge: GraphEdge;
  fromNode: GraphNode;
  toNode: GraphNode;
  cumulativeCost: number;
}
export interface RouteResult {
  segments: RouteSegment[];
  totalCost: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  transferCount: number;
  accessible: boolean;
}
export interface ConfidenceScore {
  nearestStationConfidence: number;
  snappingConfidence: number;
}
export interface DeviceLocation {
  latitude: number;
  longitude: number;
  altitudeMeters: number | null;
  accuracyMeters: number;
  altitudeAccuracyMeters: number | null;
  headingDegrees: number | null;
  speedMetersPerSecond: number | null;
  hardwareTimestampMs: number;
  provider: LocationProvider;
}

export type LocationProvider = "GPS" | "NETWORK" | "FUSED" | "PASSIVE";

export interface LocationQualityPolicy {
  maxAccuracyMeters: number;
  maxAgeMs: number;
  minSpeedForMotionMs: number;
}

export interface NearestEntranceResult {
  stationId: string;
  entranceId: string | null;
  distanceMeters: number;
  confidence: ConfidenceScore;
  displacementVectorMeters: number;
  fallbackActivated: boolean;
  locationUsed: DeviceLocation;
}

export type FindNearestEntrance = (
  locationHistory: DeviceLocation[],
  policy: LocationQualityPolicy,
) => NearestEntranceResult;
