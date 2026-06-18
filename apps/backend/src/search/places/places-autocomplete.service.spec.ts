import { ServiceUnavailableException } from '@nestjs/common';
import { PlacesAutocompleteService } from './places-autocomplete.service';
import { PlacesCacheService } from './places-cache.service';

function makeService(
  options: {
    enabled?: string;
    maxResults?: string;
    placesClient?: { autocomplete: jest.Mock };
  } = {},
) {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | undefined> = {
        PLACES_SEARCH_ENABLED: options.enabled ?? 'true',
        PLACES_MAX_RESULTS: options.maxResults ?? '5',
        PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS: '300',
        PLACES_COUNTRY_CODE: 'CL',
        PLACES_LOCATION_BIAS_LAT: '-33.4489',
        PLACES_LOCATION_BIAS_LNG: '-70.6693',
        PLACES_LOCATION_BIAS_RADIUS_METERS: '35000',
      };
      return values[key];
    }),
  };
  const cache = new PlacesCacheService();
  const placesClient = options.placesClient ?? {
    autocomplete: jest.fn().mockResolvedValue([]),
  };

  return {
    service: new PlacesAutocompleteService(
      config as never,
      cache,
      placesClient as never,
    ),
    placesClient,
  };
}

describe('PlacesAutocompleteService', () => {
  it('feature flag disabled retorna erro controlado', async () => {
    const { service } = makeService({ enabled: 'false' });

    await expect(service.search('Costanera')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('query menor que 3 retorna vazio sem chamar Google', async () => {
    const placesClient = { autocomplete: jest.fn() };
    const { service } = makeService({ placesClient });

    await expect(service.search('co')).resolves.toEqual({ results: [] });
    expect(placesClient.autocomplete).not.toHaveBeenCalled();
  });

  it('chama Google Places com token e limita resultados', async () => {
    const placesClient = {
      autocomplete: jest.fn().mockResolvedValue([
        {
          id: 'google_places:1',
          placeId: '1',
          primaryText: 'Costanera Center',
          secondaryText: 'Providencia',
          types: ['shopping_mall'],
          matchedSubstrings: [],
          source: 'google_places',
        },
        {
          id: 'google_places:2',
          placeId: '2',
          primaryText: 'Costanera Sur',
          secondaryText: 'Santiago',
          types: ['route'],
          matchedSubstrings: [],
          source: 'google_places',
        },
      ]),
    };
    const { service } = makeService({ maxResults: '1', placesClient });

    const response = await service.search('Costanera', 'session-1');

    expect(response.results).toHaveLength(1);
    expect(placesClient.autocomplete).toHaveBeenCalledWith(
      'costanera',
      'session-1',
    );
  });

  it('cache hit evita chamada repetida', async () => {
    const placesClient = {
      autocomplete: jest.fn().mockResolvedValue([
        {
          id: 'google_places:1',
          placeId: '1',
          primaryText: 'Costanera Center',
          secondaryText: 'Providencia',
          types: ['shopping_mall'],
          matchedSubstrings: [],
          source: 'google_places',
        },
      ]),
    };
    const { service } = makeService({ placesClient });

    await service.search('Costanera');
    await service.search('Costanera');

    expect(placesClient.autocomplete).toHaveBeenCalledTimes(1);
  });
});
