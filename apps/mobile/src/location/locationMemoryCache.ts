export const LOCATION_MEMORY_CACHE_TTL_IDLE_MS = 60_000;
export const LOCATION_MEMORY_CACHE_TTL_ACTIVE_TRIP_MS = 10_000;
export const LOCATION_MEMORY_CACHE_TTL_MS = LOCATION_MEMORY_CACHE_TTL_IDLE_MS;

export type CachedLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speedMps?: number | null;
  timestamp: number;
};

let lastKnownLocationCache: CachedLocation | null = null;

export function getCachedLocation(): CachedLocation | null {
  return lastKnownLocationCache;
}

export function setCachedLocation(location: CachedLocation): void {
  lastKnownLocationCache = location;
}

export function clearCachedLocation(): void {
  lastKnownLocationCache = null;
}

export function isCachedLocationFresh(
  cache: CachedLocation | null,
  now = Date.now(),
  ttlMs = LOCATION_MEMORY_CACHE_TTL_IDLE_MS,
): boolean {
  if (!cache) return false;
  return now - cache.timestamp <= ttlMs;
}

export function getLocationMemoryCacheTtlForTripStatus(
  tripStatus: string,
): number {
  return tripStatus === 'active'
    ? LOCATION_MEMORY_CACHE_TTL_ACTIVE_TRIP_MS
    : LOCATION_MEMORY_CACHE_TTL_IDLE_MS;
}
