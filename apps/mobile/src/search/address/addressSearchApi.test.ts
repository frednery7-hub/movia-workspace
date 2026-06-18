import { api } from '../../config/api';
import {
  formatAddressDistance,
  resolveAddressDestination,
  searchAddress,
  shouldSearchAddressQuery,
} from './addressSearchApi';

jest.mock('../../config/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('addressSearchApi', () => {
  beforeEach(() => {
    mockedApi.get.mockReset();
  });

  it('não chama API com menos de 3 caracteres', async () => {
    await expect(searchAddress('ab')).resolves.toEqual([]);
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('chama backend com query válida', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { results: [] } });

    await searchAddress('Av. Providencia 1200');

    expect(mockedApi.get).toHaveBeenCalledWith('/search/address', {
      params: { q: 'Av. Providencia 1200' },
      signal: undefined,
    });
  });

  it('erro 503 não quebra busca local', async () => {
    mockedApi.get.mockRejectedValueOnce({ response: { status: 503 } });

    await expect(searchAddress('Av. Providencia 1200')).resolves.toEqual([]);
  });

  it('seleção de address usa recommendedStationId e mantém label visual', () => {
    expect(resolveAddressDestination({
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
    })).toEqual({
      type: 'address',
      displayName: 'Av. Providencia 1200',
      routeDestinationStationId: 'st_tobalaba',
      routeDestinationStationName: 'Tobalaba',
      lineIds: ['L1', 'L4'],
      distanceMeters: 280,
      addressId: 'addr-1',
    });
  });

  it('distância da estação aparece formatada', () => {
    expect(formatAddressDistance(280)).toBe('280 m');
    expect(formatAddressDistance(2300)).toBe('2,3 km');
  });

  it('shouldSearchAddressQuery exige no mínimo 3 caracteres úteis', () => {
    expect(shouldSearchAddressQuery('  ab  ')).toBe(false);
    expect(shouldSearchAddressQuery('  abc  ')).toBe(true);
  });
});
