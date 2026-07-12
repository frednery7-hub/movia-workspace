import { api } from '../config/api';
import { CacheService } from '../config/cache.service';
import {
  getAllStations as getStationsFromDb,
  saveStations as saveStationsToDb,
  searchStationsByName,
  hasStations,
} from '../database/stationsRepository';

jest.mock('../config/api', () => ({ api: { get: jest.fn() } }));
jest.mock('../config/cache.service', () => ({
  CacheService: { get: jest.fn(), set: jest.fn() },
}));
jest.mock('../database/stationsRepository', () => ({
  getAllStations: jest.fn(),
  saveStations: jest.fn(),
  searchStationsByName: jest.fn(),
  hasStations: jest.fn(),
}));

// Importa depois dos mocks para que o módulo use as versões mockadas.
import { fetchAllStations, searchStations } from './useStations';

const mockApiGet = jest.mocked(api.get);
const mockCacheGet = jest.mocked(CacheService.get);
const mockCacheSet = jest.mocked(CacheService.set);
const mockDbGet = jest.mocked(getStationsFromDb);
const mockDbSave = jest.mocked(saveStationsToDb);
const mockDbSearch = jest.mocked(searchStationsByName);
const mockDbHas = jest.mocked(hasStations);

const station = {
  id: 'st_tobalaba',
  name: 'Tobalaba',
  shortCode: 'TOB',
  latitude: -33.41822,
  longitude: -70.60149,
  lines: ['L1', 'L4'],
};

describe('fetchAllStations — cascata de fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheSet.mockResolvedValue(undefined);
    mockDbSave.mockResolvedValue(undefined);
  });

  it('rede OK: usa a rede e persiste no SQLite e no AsyncStorage', async () => {
    mockApiGet.mockResolvedValue({ data: [station] });

    const result = await fetchAllStations();

    expect(result).toEqual([station]);
    expect(mockCacheSet).toHaveBeenCalled();
    expect(mockDbSave).toHaveBeenCalledWith([station]);
    // Não consulta os fallbacks quando a rede respondeu.
    expect(mockDbGet).not.toHaveBeenCalled();
    expect(mockCacheGet).not.toHaveBeenCalled();
  });

  it('rede cai: serve do SQLite', async () => {
    mockApiGet.mockRejectedValue(new Error('backend fora do ar'));
    mockDbGet.mockResolvedValue([station]);

    const result = await fetchAllStations();

    expect(result).toEqual([station]);
    // Com dados no SQLite, nem chega a consultar o AsyncStorage.
    expect(mockCacheGet).not.toHaveBeenCalled();
  });

  it('rede cai e SQLite vazio: serve do AsyncStorage', async () => {
    mockApiGet.mockRejectedValue(new Error('backend fora do ar'));
    mockDbGet.mockResolvedValue([]);
    mockCacheGet.mockResolvedValue([station]);

    const result = await fetchAllStations();

    expect(result).toEqual([station]);
  });

  it('rede cai e SQLite QUEBRA: ainda serve do AsyncStorage', async () => {
    // Um banco local corrompido não pode derrubar o app -- ele deve
    // simplesmente cair para a próxima camada.
    mockApiGet.mockRejectedValue(new Error('backend fora do ar'));
    mockDbGet.mockRejectedValue(new Error('banco corrompido'));
    mockCacheGet.mockResolvedValue([station]);

    const result = await fetchAllStations();

    expect(result).toEqual([station]);
  });

  it('tudo falha: lança erro explícito', async () => {
    mockApiGet.mockRejectedValue(new Error('backend fora do ar'));
    mockDbGet.mockResolvedValue([]);
    mockCacheGet.mockResolvedValue(null);

    await expect(fetchAllStations()).rejects.toThrow(
      'Sem conexão e sem cache de estações',
    );
  });

  it('falha ao gravar no SQLite não derruba o fluxo (best-effort)', async () => {
    mockApiGet.mockResolvedValue({ data: [station] });
    mockDbSave.mockRejectedValue(new Error('disco cheio'));

    // A gravação é fire-and-forget: o usuário recebe os dados da rede
    // mesmo que a persistência local falhe.
    const result = await fetchAllStations();
    expect(result).toEqual([station]);
  });
});

describe('searchStations — busca com fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rede OK: busca no backend', async () => {
    mockApiGet.mockResolvedValue({ data: [station] });

    const result = await searchStations('toba');

    expect(result).toEqual([station]);
    expect(mockDbSearch).not.toHaveBeenCalled();
  });

  it('rede cai com estações locais: busca no SQLite', async () => {
    mockApiGet.mockRejectedValue(new Error('backend fora do ar'));
    mockDbHas.mockResolvedValue(true);
    mockDbSearch.mockResolvedValue([station]);

    const result = await searchStations('toba');

    expect(result).toEqual([station]);
    expect(mockDbSearch).toHaveBeenCalledWith('toba');
  });

  it('rede cai e não há estações locais: lança erro', async () => {
    mockApiGet.mockRejectedValue(new Error('backend fora do ar'));
    mockDbHas.mockResolvedValue(false);

    await expect(
      searchStations('toba'),
    ).rejects.toThrow('Sem conexão e sem estações salvas localmente');
  });
});
