import { fetchEta } from './useEta';
import { api } from '../config/api';
import { CacheService } from '../config/cache.service';
import { isOnline } from '../network/connectivity';

jest.mock('../config/api', () => ({
  api: { get: jest.fn() },
}));

jest.mock('../config/cache.service', () => ({
  CacheService: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('../network/connectivity', () => ({
  isOnline: jest.fn(),
}));

const mockApiGet = jest.mocked(api.get);
const mockCacheGet = jest.mocked(CacheService.get);
const mockCacheSet = jest.mocked(CacheService.set);
const mockIsOnline = jest.mocked(isOnline);

const sampleRoute = {
  destination: 'Baquedano',
  path: [{ id: 'st_bio_bio', name: 'Bío Bío', lineId: 'L6' }],
  stationsCount: 1,
  linesOnRoute: ['L6'],
  status: 'NORMAL',
} as never;

describe('fetchEta — fallback offline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rede OK: retorna a rota e grava no cache', async () => {
    mockApiGet.mockResolvedValue({ data: sampleRoute });

    const result = await fetchEta('st_baquedano', 'st_bio_bio');

    expect(result).toMatchObject({ destination: 'Baquedano' });
    expect(result.servedFromCache).toBeUndefined();
    expect(mockCacheSet).toHaveBeenCalledWith(
      'eta_st_bio_bio_st_baquedano',
      sampleRoute,
      expect.any(Number),
    );
  });

  it('rede falha COM cache: serve a rota em cache marcada como servedFromCache', async () => {
    mockApiGet.mockRejectedValue(new Error('network down'));
    mockCacheGet.mockResolvedValue(sampleRoute);

    const result = await fetchEta('st_baquedano', 'st_bio_bio');

    expect(result).toMatchObject({ destination: 'Baquedano' });
    expect(result.servedFromCache).toBe(true);
    expect(mockCacheGet).toHaveBeenCalledWith('eta_st_bio_bio_st_baquedano');
  });

  it('rede falha SEM cache e offline: lança erro específico OFFLINE_NO_CACHED_ROUTE', async () => {
    mockApiGet.mockRejectedValue(new Error('network down'));
    mockCacheGet.mockResolvedValue(null);
    mockIsOnline.mockResolvedValue(false);

    await expect(fetchEta('st_baquedano', 'st_bio_bio')).rejects.toThrow(
      'OFFLINE_NO_CACHED_ROUTE',
    );
  });

  it('rede falha SEM cache mas online: propaga o erro original (ex: sem rota)', async () => {
    const originalError = new Error('NO_ROUTE');
    mockApiGet.mockRejectedValue(originalError);
    mockCacheGet.mockResolvedValue(null);
    mockIsOnline.mockResolvedValue(true);

    await expect(fetchEta('st_baquedano', 'st_bio_bio')).rejects.toThrow('NO_ROUTE');
  });
});
