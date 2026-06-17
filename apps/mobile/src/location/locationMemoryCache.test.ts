import {
  clearCachedLocation,
  getCachedLocation,
  getLocationMemoryCacheTtlForTripStatus,
  isCachedLocationFresh,
  LOCATION_MEMORY_CACHE_TTL_ACTIVE_TRIP_MS,
  LOCATION_MEMORY_CACHE_TTL_IDLE_MS,
  LOCATION_MEMORY_CACHE_TTL_MS,
  setCachedLocation,
} from './locationMemoryCache';

describe('locationMemoryCache', () => {
  beforeEach(() => {
    clearCachedLocation();
  });

  it('guarda e retorna a última localização conhecida em RAM', () => {
    const location = {
      latitude: -33.45,
      longitude: -70.66,
      accuracy: 24,
      timestamp: 1_000,
    };

    setCachedLocation(location);

    expect(getCachedLocation()).toEqual(location);
  });

  it('considera cache fresco até 1 minuto', () => {
    const cache = {
      latitude: -33.45,
      longitude: -70.66,
      timestamp: 10_000,
    };

    expect(isCachedLocationFresh(cache, 10_000 + LOCATION_MEMORY_CACHE_TTL_MS)).toBe(true);
  });

  it('tripStatus preview usa TTL idle', () => {
    expect(getLocationMemoryCacheTtlForTripStatus('preview')).toBe(
      LOCATION_MEMORY_CACHE_TTL_IDLE_MS,
    );
  });

  it('tripStatus active usa TTL active', () => {
    expect(getLocationMemoryCacheTtlForTripStatus('active')).toBe(
      LOCATION_MEMORY_CACHE_TTL_ACTIVE_TRIP_MS,
    );
  });

  it('aceita TTL active menor durante rota ativa', () => {
    const cache = {
      latitude: -33.45,
      longitude: -70.66,
      timestamp: 10_000,
    };

    expect(isCachedLocationFresh(
      cache,
      10_000 + LOCATION_MEMORY_CACHE_TTL_ACTIVE_TRIP_MS,
      LOCATION_MEMORY_CACHE_TTL_ACTIVE_TRIP_MS,
    )).toBe(true);
    expect(isCachedLocationFresh(
      cache,
      10_000 + LOCATION_MEMORY_CACHE_TTL_ACTIVE_TRIP_MS + 1,
      LOCATION_MEMORY_CACHE_TTL_ACTIVE_TRIP_MS,
    )).toBe(false);
  });

  it('considera cache vencido após 1 minuto', () => {
    const cache = {
      latitude: -33.45,
      longitude: -70.66,
      timestamp: 10_000,
    };

    expect(isCachedLocationFresh(cache, 10_000 + LOCATION_MEMORY_CACHE_TTL_MS + 1)).toBe(false);
  });
});
