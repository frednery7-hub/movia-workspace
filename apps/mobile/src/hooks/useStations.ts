import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';
import { CacheService } from '../config/cache.service';

const CACHE_KEY = 'stations_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export interface StationResult {
  id: string;
  name: string;
  shortCode: string;
  latitude: number;
  longitude: number;
}

async function fetchAllStations(): Promise<StationResult[]> {
  try {
    const { data } = await api.get<StationResult[]>('/stations');
    await CacheService.set(CACHE_KEY, data, CACHE_TTL);
    return data;
  } catch {
    const cached = await CacheService.get<StationResult[]>(CACHE_KEY);
    if (cached) return cached;
    throw new Error('Sem conexão e sem cache de estações.');
  }
}

async function searchStations(q: string): Promise<StationResult[]> {
  const { data } = await api.get<StationResult[]>(`/stations?q=${encodeURIComponent(q)}`);
  return data;
}


function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  if (!stations.length) return null;
  return stations.reduce((nearest, s) => {
    const d = haversineKm(lat, lon, s.latitude, s.longitude);
    const dn = haversineKm(lat, lon, nearest.latitude, nearest.longitude);
    return d < dn ? s : nearest;
  });
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
