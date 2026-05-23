import type {
  DeviceLocation,
  LocationQualityPolicy,
  NearestEntranceResult,
  FindNearestEntrance,
} from "@movia/shared-types";
import { haversineMeters } from "./haversine.ts";
import { applySpeedGate } from "./speed-gate.ts";
import type { SpatialIndex, StationRecord } from "./spatial-index.ts";

export class GeoEngineError extends Error {
  constructor(
    public readonly code:
      | "INSUFFICIENT_DATA"
      | "ALL_PINGS_REJECTED"
      | "NO_STATION_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "GeoEngineError";
  }
}

export class GeoEngine {
  constructor(private readonly spatialIndex: SpatialIndex) {}

  readonly findNearestEntrance: FindNearestEntrance = (
    locationHistory: DeviceLocation[],
    policy: LocationQualityPolicy,
  ): NearestEntranceResult => {
    // ── Fase 1: sanitizacao imune a Epoch ────────────────────────
    const maxTimestamp = Math.max(
      ...locationHistory.map((p) => p.hardwareTimestampMs),
    );

    const sanitized = locationHistory
      .filter((p) => maxTimestamp - p.hardwareTimestampMs <= policy.maxAgeMs)
      .filter((p) => p.accuracyMeters <= policy.maxAccuracyMeters)
      .sort((a, b) => a.hardwareTimestampMs - b.hardwareTimestampMs);

    if (sanitized.length === 0) {
      throw new GeoEngineError(
        "INSUFFICIENT_DATA",
        "No valid pings after sanitization",
      );
    }

    // ── Fase 2: Speed Gate com Reset Threshold ────────────────────
    const { validPings, anchorReset } = applySpeedGate(sanitized);

    if (validPings.length === 0) {
      throw new GeoEngineError(
        "ALL_PINGS_REJECTED",
        "All pings rejected by speed gate",
      );
    }

    // ── Fase 3: ancora + vetor de deslocamento ────────────────────
    const anchor = validPings[validPings.length - 1];
    const first = validPings[0];
    const displacement = haversineMeters(
      first.latitude,
      first.longitude,
      anchor.latitude,
      anchor.longitude,
    );

    // ── Fase 4: busca geometrica via SpatialIndex ─────────────────
    const candidates = this.spatialIndex.findCandidates(
      anchor.latitude,
      anchor.longitude,
      2000,
    );

    if (candidates.length === 0) {
      throw new GeoEngineError(
        "NO_STATION_FOUND",
        "No station within 2km radius",
      );
    }

    const { station, entranceId, distanceMeters } = this.findNearest(
      anchor,
      candidates,
    );

    const fallbackActivated =
      anchorReset ||
      validPings.length < sanitized.length ||
      sanitized.length < locationHistory.length;

    return {
      stationId: station.stationId,
      entranceId,
      distanceMeters,
      displacementVectorMeters: displacement,
      fallbackActivated,
      locationUsed: anchor,
      confidence: {
        nearestStationConfidence: Math.max(0, 1 - anchor.accuracyMeters / 100),
        snappingConfidence: Math.max(0, 1 - distanceMeters / 500),
      },
    };
  };

  private findNearest(
    anchor: DeviceLocation,
    candidates: StationRecord[],
  ): {
    station: StationRecord;
    entranceId: string | null;
    distanceMeters: number;
  } {
    let best: StationRecord = candidates[0];
    let bestEntranceId: string | null = null;
    let bestDistance: number = Infinity;

    for (const station of candidates) {
      if (station.entrances.length > 0) {
        for (const entrance of station.entrances) {
          const d = haversineMeters(
            anchor.latitude,
            anchor.longitude,
            entrance.latitude,
            entrance.longitude,
          );
          if (d < bestDistance) {
            bestDistance = d;
            best = station;
            bestEntranceId = entrance.entranceId;
          }
        }
      } else {
        const d = haversineMeters(
          anchor.latitude,
          anchor.longitude,
          station.latitude,
          station.longitude,
        );
        if (d < bestDistance) {
          bestDistance = d;
          best = station;
          bestEntranceId = null;
        }
      }
    }

    return {
      station: best,
      entranceId: bestEntranceId,
      distanceMeters: bestDistance,
    };
  }
}
