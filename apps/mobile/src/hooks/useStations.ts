import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';
import { CacheService } from '../config/cache.service';
import {
  getAllStations as getStationsFromDb,
  saveStations as saveStationsToDb,
  searchStationsByName,
  hasStations,
} from '../database/stationsRepository';

const CACHE_KEY = 'stations_v2';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export interface StationResult {
  id: string;
  name: string;
  shortCode: string;
  latitude: number;
  longitude: number;
  lines?: string[];
}

export interface NearbyStation {
  station: StationResult;
  distanceMeters: number;
}

/**
 * Busca todas as estações, com três camadas de resiliência:
 *   1. Rede (fonte de verdade) — persiste no SQLite e no AsyncStorage
 *   2. SQLite local — sobrevive a reinstalação do cache, permite query
 *   3. AsyncStorage — fallback legado, mantido por compatibilidade
 *
 * A gravação no SQLite é best-effort: se falhar, o app continua
 * funcionando com os dados da rede. Um banco local corrompido não
 * pode derrubar a funcionalidade principal.
 */
export async function fetchAllStations(): Promise<StationResult[]> {
  try {
    const { data } = await api.get<StationResult[]>('/stations');

    await CacheService.set(CACHE_KEY, data, CACHE_TTL);
    saveStationsToDb(data).catch(() => undefined);

    return data;
  } catch {
    try {
      const local = await getStationsFromDb();
      if (local.length > 0) return local;
    } catch {
      // Banco local indisponível — tenta o AsyncStorage abaixo.
    }

    const cached = await CacheService.get<StationResult[]>(CACHE_KEY);
    if (cached) return cached;

    throw new Error('Sem conexão e sem cache de estações.');
  }
}

/**
 * Busca estações por nome. Se a rede falhar, cai para o SQLite local.
 *
 * Antes desta mudança, a busca simplesmente quebrava sem internet,
 * mesmo com as 126 estações já em cache.
 */
export async function searchStations(q: string): Promise<StationResult[]> {
  try {
    const { data } = await api.get<StationResult[]>(`/stations?q=${encodeURIComponent(q)}`);
    return data;
  } catch {
    const hasLocal = await hasStations().catch(() => false);
    if (hasLocal) {
      return searchStationsByName(q);
    }
    throw new Error('Sem conexão e sem estações salvas localmente.');
  }
}


export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestStation(
  stations: StationResult[],
  lat: number,
  lon: number,
): StationResult | null {
  return findNearestStationWithDistance(stations, lat, lon)?.station ?? null;
}

export function findNearestStationWithDistance(
  stations: StationResult[],
  lat: number,
  lon: number,
): NearbyStation | null {
  if (!stations.length) return null;
  return stations
    .map(station => ({
      station,
      distanceMeters: Math.round(haversineKm(lat, lon, station.latitude, station.longitude) * 1000),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null;
}

export function findNearbyStations(
  stations: StationResult[],
  lat: number,
  lon: number,
  radiusMeters = 500,
): NearbyStation[] {
  return stations
    .map(station => ({
      station,
      distanceMeters: Math.round(haversineKm(lat, lon, station.latitude, station.longitude) * 1000),
    }))
    .filter(item => item.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function useStationSearch(query: string) {
  return useQuery({
    queryKey: ['stations', 'search', query],
    queryFn: () => searchStations(query),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: fetchAllStations,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });
}
