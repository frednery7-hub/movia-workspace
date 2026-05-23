import type { Direction } from "@movia/shared-types";

export interface EntranceSeed {
  id: string;
  latitude: number;
  longitude: number;
  accessible: boolean;
}

export interface StationSeed {
  id: string;
  name: string;
  shortCode: string;
  latitude: number;
  longitude: number;
  isUnderground: boolean;
  hasElevator: boolean;
  hasEscalator: boolean;
  wheelchairAccessible: boolean;
  entrances: EntranceSeed[];
}

export interface LineSeed {
  id: string;
  name: string;
  color: string;
}

export interface PlatformSeed {
  id: string;
  stationId: string;
  lineId: string;
}

export interface TimeProfileSeed {
  serviceId: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
}

export interface SegmentSeed {
  id: string;
  fromPlatformId: string;
  toPlatformId: string;
  lineId: string;
  direction: Direction;
  sequence: number;
  distanceMeters: number;
  averageDurationSeconds: number;
  timeProfiles: TimeProfileSeed[];
}

export interface TransferSeed {
  id: string;
  fromPlatformId: string;
  toPlatformId: string;
  walkingSeconds: number;
  accessibilityFriendly: boolean;
  platformChange: boolean;
}

export interface LineDefinition {
  line: LineSeed;
  platforms: PlatformSeed[];
  segments: SegmentSeed[];
}
