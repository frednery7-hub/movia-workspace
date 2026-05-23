import { haversineMeters } from "./haversine.ts";

export interface EntranceRecord {
  entranceId: string;
  latitude: number;
  longitude: number;
  accessible: boolean;
}

export interface StationRecord {
  stationId: string;
  latitude: number;
  longitude: number;
  entrances: EntranceRecord[];
}

/**
 * Contrato do índice espacial.
 * MVP usa LinearSpatialIndex O(n).
 * Futuro (ônibus Red / multi-cidade) usa GridSpatialIndex O(log n).
 */
export interface SpatialIndex {
  findCandidates(
    lat: number,
    lon: number,
    radiusMeters: number,
  ): StationRecord[];
}

/** Scan linear — aceitável para até ~500 estações. */
export class LinearSpatialIndex implements SpatialIndex {
  constructor(private readonly stations: StationRecord[]) {}

  findCandidates(
    lat: number,
    lon: number,
    radiusMeters: number,
  ): StationRecord[] {
    return this.stations.filter(
      (s) => haversineMeters(lat, lon, s.latitude, s.longitude) <= radiusMeters,
    );
  }
}

/**
 * Stub para evolução futura.
 * Implementar quando rede de ônibus (Red) for adicionada.
 */
export class GridSpatialIndex implements SpatialIndex {
  findCandidates(
    _lat: number,
    _lon: number,
    _radiusMeters: number,
  ): StationRecord[] {
    throw new Error(
      "GridSpatialIndex not implemented yet — use LinearSpatialIndex for MVP",
    );
  }
}
