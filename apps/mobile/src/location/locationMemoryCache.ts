export const LOCATION_MEMORY_CACHE_TTL_MS = 60_000;

export type CachedLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
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
): boolean {
  if (!cache) return false;
  return now - cache.timestamp <= LOCATION_MEMORY_CACHE_TTL_MS;
}
