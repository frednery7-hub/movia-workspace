import { ServiceUnavailableException } from '@nestjs/common';
import { AddressSearchCacheService } from './address-search-cache.service';
import { AddressSearchService } from './address-search.service';
import {
  createAddressQueryHash,
  normalizeAddressQuery,
} from './address-query.util';
import { originLineIdsCacheKeyPart } from './line-id.util';

function makeService(
  options: {
    enabled?: string;
    maxResults?: string;
    cache?: AddressSearchCacheService;
    geocoding?: { searchAddress: jest.Mock };
    stationNearest?: { findNearestStation: jest.Mock };
  } = {},
) {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | undefined> = {
        ADDRESS_SEARCH_ENABLED: options.enabled ?? 'true',
        ADDRESS_SEARCH_MAX_RESULTS: options.maxResults ?? '5',
        ADDRESS_SEARCH_CACHE_TTL_SECONDS: '604800',
      };
      return values[key];
    }),
  };
  const cache = options.cache ?? new AddressSearchCacheService();
  const geocoding = options.geocoding ?? {
    searchAddress: jest.fn().mockResolvedValue([]),
  };
  const stationNearest = options.stationNearest ?? {
    findNearestStation: jest.fn().mockResolvedValue({
      id: 'st_tobalaba',
      name: 'Tobalaba',
      lineIds: ['L1', 'L4'],
      distanceMeters: 280,
    }),
  };

  return {
    service: new AddressSearchService(
      config as never,
      cache,
      geocoding as never,
      stationNearest as never,
    ),
    geocoding,
    stationNearest,
  };
}

describe('AddressSearchService', () => {
  it('feature flag disabled retorna erro controlado', async () => {
    const { service } = makeService({ enabled: 'false' });

    await expect(service.search('Av. Providencia 1200')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('cache hit evita chamada Google', async () => {
    const cache = new AddressSearchCacheService();
    const cacheKey = createAddressQueryHash(
      `${normalizeAddressQuery('Av. Providencia 1200')}|${originLineIdsCacheKeyPart(undefined)}`,
    );
    cache.set(cacheKey, [
      {
        id: 'addr-1',
        label: 'Av. Providencia 1200',
        formattedAddress: 'Av. Providencia 1200, Santiago, Chile',
        latitude: -33.42,
        longitude: -70.6,
        nearestStation: {
          id: 'st_tobalaba',
          name: 'Tobalaba',
          lineIds: ['L1', 'L4'],
          distanceMeters: 280,
        },
        source: 'google_geocoding',
      },
    ]);
    const geocoding = { searchAddress: jest.fn() };
    const { service } = makeService({ cache, geocoding });

    const response = await service.search('Av. Providencia 1200');

    expect(geocoding.searchAddress).not.toHaveBeenCalled();
    expect(response.results[0].source).toBe('cache');
  });

  it('cache miss chama geocoding client e calcula estação mais próxima', async () => {
    const geocoding = {
      searchAddress: jest.fn().mockResolvedValue([
        {
          id: 'google-1',
          label: 'av. providencia 1200',
          formattedAddress: 'Av. Providencia 1200, Santiago, Chile',
          latitude: -33.42,
          longitude: -70.6,
          provider: 'google_geocoding',
        },
      ]),
    };
    const stationNearest = {
      findNearestStation: jest.fn().mockResolvedValue({
        id: 'st_tobalaba',
        name: 'Tobalaba',
        lineIds: ['L1', 'L4'],
        distanceMeters: 280,
      }),
    };
    const { service } = makeService({ geocoding, stationNearest });

    await expect(service.search('Av. Providencia 1200')).resolves.toEqual({
      results: [
        {
          id: 'google-1',
          label: 'av. providencia 1200',
          formattedAddress: 'Av. Providencia 1200, Santiago, Chile',
          latitude: -33.42,
          longitude: -70.6,
          nearestStation: {
            id: 'st_tobalaba',
            name: 'Tobalaba',
            lineIds: ['L1', 'L4'],
            distanceMeters: 280,
          },
          source: 'google_geocoding',
        },
      ],
    });
    expect(stationNearest.findNearestStation).toHaveBeenCalledWith({
      latitude: -33.42,
      longitude: -70.6,
    });
  });

  it('ordena resultados por distância e aplica limite', async () => {
    const geocoding = {
      searchAddress: jest.fn().mockResolvedValue([
        {
          id: 'far',
          label: 'far',
          formattedAddress: 'far',
          latitude: 1,
          longitude: 1,
          provider: 'google_geocoding',
        },
        {
          id: 'near',
          label: 'near',
          formattedAddress: 'near',
          latitude: 2,
          longitude: 2,
          provider: 'google_geocoding',
        },
      ]),
    };
    const stationNearest = {
      findNearestStation: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'st_far',
          name: 'Far',
          lineIds: ['L1'],
          distanceMeters: 900,
        })
        .mockResolvedValueOnce({
          id: 'st_near',
          name: 'Near',
          lineIds: ['L1'],
          distanceMeters: 100,
        }),
    };
    const { service } = makeService({
      geocoding,
      stationNearest,
      maxResults: '2',
    });

    const response = await service.search('Moneda 800');

    expect(response.results.map((result) => result.id)).toEqual([
      'near',
      'far',
    ]);
  });

  it('trata erro Google sem derrubar app quando cliente retorna vazio', async () => {
    const { service } = makeService({
      geocoding: { searchAddress: jest.fn().mockResolvedValue([]) },
    });

    await expect(service.search('Rua inexistente')).resolves.toEqual({
      results: [],
    });
  });
});
