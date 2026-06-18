import { api } from '../../config/api';
import {
  createPlacesSessionToken,
  getPlaceDetails,
  resolvePlaceDestination,
  searchPlacesAutocomplete,
  shouldSearchPlacesQuery,
} from './placesSearchApi';

jest.mock('../../config/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('placesSearchApi', () => {
  beforeEach(() => {
    mockedApi.get.mockReset();
  });

  it('não chama autocomplete com menos de 3 caracteres', async () => {
    await expect(searchPlacesAutocomplete('co')).resolves.toEqual([]);
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('chama autocomplete com session token', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { results: [] } });

    await searchPlacesAutocomplete('Costanera', {
      sessionToken: 'token-1',
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/search/places/autocomplete', {
      params: { q: 'Costanera', sessionToken: 'token-1' },
      signal: undefined,
    });
  });

  it('busca details pelo placeId', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        place: { placeId: 'place-1' },
        nearestStation: { id: 'st_tobalaba' },
      },
    });

    await getPlaceDetails('place-1', { sessionToken: 'token-1' });

    expect(mockedApi.get).toHaveBeenCalledWith('/search/places/details', {
      params: { placeId: 'place-1', sessionToken: 'token-1' },
      signal: undefined,
    });
  });

  it('resolve place para estação recomendada preservando label visual', () => {
    expect(resolvePlaceDestination({
      place: {
        id: 'google_places:place-1',
        placeId: 'place-1',
        name: 'Costanera Center',
        formattedAddress: 'Av. Andres Bello 2425',
        latitude: -33.41,
        longitude: -70.6,
        types: ['shopping_mall'],
        source: 'google_places',
      },
      nearestStation: {
        id: 'st_tobalaba',
        name: 'Tobalaba',
        lineIds: ['L1', 'L4'],
        distanceMeters: 180,
      },
    })).toEqual({
      type: 'place',
      displayName: 'Costanera Center',
      routeDestinationStationId: 'st_tobalaba',
      routeDestinationStationName: 'Tobalaba',
      lineIds: ['L1', 'L4'],
      distanceMeters: 180,
      placeId: 'place-1',
    });
  });

  it('não resolve destino quando details não tem estação próxima', () => {
    expect(resolvePlaceDestination({
      place: {
        id: 'google_places:place-1',
        placeId: 'place-1',
        name: 'Lugar sem metrô próximo',
        formattedAddress: 'Santiago',
        latitude: -33.41,
        longitude: -70.6,
        types: ['point_of_interest'],
        source: 'google_places',
      },
      nearestStation: null,
    })).toBeNull();
  });

  it('gera session token local e valida query mínima', () => {
    expect(createPlacesSessionToken()).toContain('movia-');
    expect(shouldSearchPlacesQuery('ab')).toBe(false);
    expect(shouldSearchPlacesQuery('abc')).toBe(true);
  });
});
