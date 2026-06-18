import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PlacesDetailsService } from './places-details.service';
import { PlacesCacheService } from './places-cache.service';

function makeService(
  options: {
    enabled?: string;
    placesClient?: { getDetails: jest.Mock };
    stationNearest?: { findNearestStation: jest.Mock };
  } = {},
) {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | undefined> = {
        PLACES_SEARCH_ENABLED: options.enabled ?? 'true',
        PLACES_DETAILS_CACHE_TTL_SECONDS: '604800',
      };
      return values[key];
    }),
  };
  const cache = new PlacesCacheService();
  const placesClient = options.placesClient ?? {
    getDetails: jest.fn().mockResolvedValue(null),
  };
  const stationNearest = options.stationNearest ?? {
    findNearestStation: jest.fn().mockResolvedValue({
      id: 'st_tobalaba',
      name: 'Tobalaba',
      lineIds: ['L1', 'L4'],
      distanceMeters: 180,
    }),
  };

  return {
    service: new PlacesDetailsService(
      config as never,
      cache,
      placesClient as never,
      stationNearest as never,
    ),
    placesClient,
    stationNearest,
  };
}

describe('PlacesDetailsService', () => {
  it('feature flag disabled retorna erro controlado', async () => {
    const { service } = makeService({ enabled: 'false' });

    await expect(service.resolve('place-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('retorna 502 quando Google não resolve o place', async () => {
    const { service } = makeService({
      placesClient: { getDetails: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.resolve('place-1')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('resolve place details e calcula estação mais próxima', async () => {
    const placesClient = {
      getDetails: jest.fn().mockResolvedValue({
        placeId: 'place-1',
        name: 'Costanera Center',
        formattedAddress: 'Av. Andres Bello 2425',
        latitude: -33.4172,
        longitude: -70.6065,
        types: ['shopping_mall'],
      }),
    };
    const stationNearest = {
      findNearestStation: jest.fn().mockResolvedValue({
        id: 'st_tobalaba',
        name: 'Tobalaba',
        lineIds: ['L1', 'L4'],
        distanceMeters: 180,
      }),
    };
    const { service } = makeService({ placesClient, stationNearest });

    await expect(service.resolve('place-1', 'session-1')).resolves.toEqual({
      place: {
        id: 'google_places:place-1',
        placeId: 'place-1',
        name: 'Costanera Center',
        formattedAddress: 'Av. Andres Bello 2425',
        latitude: -33.4172,
        longitude: -70.6065,
        types: ['shopping_mall'],
        source: 'google_places',
      },
      nearestStation: {
        id: 'st_tobalaba',
        name: 'Tobalaba',
        lineIds: ['L1', 'L4'],
        distanceMeters: 180,
      },
    });
    expect(stationNearest.findNearestStation).toHaveBeenCalledWith({
      latitude: -33.4172,
      longitude: -70.6065,
    });
    expect(placesClient.getDetails).toHaveBeenCalledWith(
      'place-1',
      'session-1',
    );
  });

  it('cache hit evita segunda chamada ao Google', async () => {
    const placesClient = {
      getDetails: jest.fn().mockResolvedValue({
        placeId: 'place-1',
        name: 'Costanera Center',
        formattedAddress: 'Av. Andres Bello 2425',
        latitude: -33.4172,
        longitude: -70.6065,
        types: ['shopping_mall'],
      }),
    };
    const { service } = makeService({ placesClient });

    await service.resolve('place-1');
    await service.resolve('place-1');

    expect(placesClient.getDetails).toHaveBeenCalledTimes(1);
  });

  it('retorna nearestStation null se não houver estação calculável', async () => {
    const placesClient = {
      getDetails: jest.fn().mockResolvedValue({
        placeId: 'place-1',
        name: 'Lugar fora da malha',
        formattedAddress: 'Santiago',
        latitude: -33.4172,
        longitude: -70.6065,
        types: ['point_of_interest'],
      }),
    };
    const stationNearest = {
      findNearestStation: jest.fn().mockRejectedValue(new Error('not found')),
    };
    const { service } = makeService({ placesClient, stationNearest });

    await expect(service.resolve('place-1')).resolves.toEqual({
      place: {
        id: 'google_places:place-1',
        placeId: 'place-1',
        name: 'Lugar fora da malha',
        formattedAddress: 'Santiago',
        latitude: -33.4172,
        longitude: -70.6065,
        types: ['point_of_interest'],
        source: 'google_places',
      },
      nearestStation: null,
    });
  });
});
