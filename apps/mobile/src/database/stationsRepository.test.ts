import {
  getAllLines,
  getAllStations,
  hasStations,
  saveLines,
  saveStations,
  searchStationsByName,
} from './stationsRepository';
import { getDatabase, setMetaValue } from './database';

jest.mock('./database', () => ({
  getDatabase: jest.fn(),
  getMetaValue: jest.fn(),
  setMetaValue: jest.fn(),
}));

const mockGetDatabase = jest.mocked(getDatabase);
const mockSetMetaValue = jest.mocked(setMetaValue);

function makeMockDb() {
  const runAsync = jest.fn().mockResolvedValue(undefined);
  const execAsync = jest.fn().mockResolvedValue(undefined);
  const getAllAsync = jest.fn().mockResolvedValue([]);
  const getFirstAsync = jest.fn().mockResolvedValue(null);
  const withTransactionAsync = jest.fn(async (cb: () => Promise<void>) => {
    await cb();
  });

  return {
    runAsync,
    execAsync,
    getAllAsync,
    getFirstAsync,
    withTransactionAsync,
  };
}

describe('stationsRepository', () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    jest.clearAllMocks();
    db = makeMockDb();
    mockGetDatabase.mockResolvedValue(db as never);
    mockSetMetaValue.mockResolvedValue(undefined);
  });

  describe('saveStations', () => {
    it('grava estações e suas linhas dentro de uma transação', async () => {
      await saveStations([
        {
          id: 'st_tobalaba',
          name: 'Tobalaba',
          shortCode: 'TOB',
          latitude: -33.41822,
          longitude: -70.60149,
          lines: ['L1', 'L4'],
        },
      ]);

      expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(db.execAsync).toHaveBeenCalledWith(
        'DELETE FROM station_lines; DELETE FROM stations;',
      );
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO stations'),
        ['st_tobalaba', 'Tobalaba', 'tobalaba', 'TOB', -33.41822, -70.60149],
      );
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO station_lines'),
        ['st_tobalaba', 'L1'],
      );
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO station_lines'),
        ['st_tobalaba', 'L4'],
      );
    });

    it('registra o timestamp de sincronização', async () => {
      await saveStations([]);
      expect(mockSetMetaValue).toHaveBeenCalledWith(
        'stations_synced_at',
        expect.any(String),
      );
    });

    it('lida com estação sem linhas sem quebrar', async () => {
      await saveStations([
        {
          id: 'st_orphan',
          name: 'Órfã',
          shortCode: 'ORF',
          latitude: 0,
          longitude: 0,
        },
      ]);

      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO stations'),
        ['st_orphan', 'Órfã', 'orfa', 'ORF', 0, 0],
      );
      // Nenhuma inserção em station_lines
      const lineInserts = db.runAsync.mock.calls.filter(
        ([sql]) => typeof sql === 'string' && sql.includes('station_lines'),
      );
      expect(lineInserts).toHaveLength(0);
    });
  });

  describe('getAllStations', () => {
    it('retorna vazio quando não há estações', async () => {
      db.getAllAsync.mockResolvedValue([]);
      await expect(getAllStations()).resolves.toEqual([]);
    });

    it('reconstrói estações com suas linhas', async () => {
      db.getAllAsync
        .mockResolvedValueOnce([
          {
            id: 'st_tobalaba',
            name: 'Tobalaba',
            short_code: 'TOB',
            latitude: -33.41822,
            longitude: -70.60149,
          },
        ])
        .mockResolvedValueOnce([
          { station_id: 'st_tobalaba', line_id: 'L1' },
          { station_id: 'st_tobalaba', line_id: 'L4' },
        ]);

      const stations = await getAllStations();

      expect(stations).toEqual([
        {
          id: 'st_tobalaba',
          name: 'Tobalaba',
          shortCode: 'TOB',
          latitude: -33.41822,
          longitude: -70.60149,
          lines: ['L1', 'L4'],
        },
      ]);
    });
  });

  describe('searchStationsByName', () => {
    it('retorna vazio sem consultar linhas quando nada casa', async () => {
      db.getAllAsync.mockResolvedValueOnce([]);
      const result = await searchStationsByName('inexistente');
      expect(result).toEqual([]);
      expect(db.getAllAsync).toHaveBeenCalledTimes(1);
    });

    it('busca com LIKE case-insensitive e limite', async () => {
      db.getAllAsync
        .mockResolvedValueOnce([
          { id: 'st_a', name: 'Baquedano', short_code: 'BAQ', latitude: 1, longitude: 2 },
        ])
        .mockResolvedValueOnce([{ station_id: 'st_a', line_id: 'L1' }]);

      const result = await searchStationsByName('baque');

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('name_normalized LIKE ?'),
        ['%baque%'],
      );
      expect(result[0]?.lines).toEqual(['L1']);
    });

    it('normaliza acentos: busca "nuble" encontra "Ñuble"', async () => {
      db.getAllAsync
        .mockResolvedValueOnce([
          { id: 'st_nuble', name: 'Ñuble', short_code: 'NUB', latitude: 1, longitude: 2 },
        ])
        .mockResolvedValueOnce([]);

      await searchStationsByName('nuble');

      // A query do usuário (sem acento/til) vira o pattern normalizado
      // que casa com o name_normalized gravado ('nuble').
      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('name_normalized LIKE ?'),
        ['%nuble%'],
      );
    });

    it('normaliza maiúsculas e acentos juntos: "BIO" casa com "Bío Bío"', async () => {
      db.getAllAsync.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await searchStationsByName('BÍO');

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('name_normalized LIKE ?'),
        ['%bio%'],
      );
    });
  });

  describe('saveLines / getAllLines', () => {
    it('grava linhas em transação', async () => {
      await saveLines([{ id: 'L1', name: 'Línea 1', color: '#E4002B', status: 'NORMAL' }]);

      expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lines'),
        ['L1', 'Línea 1', '#E4002B', 'NORMAL'],
      );
    });

    it('converte status null de volta para undefined', async () => {
      db.getAllAsync.mockResolvedValue([
        { id: 'L1', name: 'Línea 1', color: '#E4002B', status: null },
      ]);

      const lines = await getAllLines();
      expect(lines[0]?.status).toBeUndefined();
    });
  });

  describe('hasStations', () => {
    it('retorna true quando há pelo menos uma estação', async () => {
      db.getFirstAsync.mockResolvedValue({ count: 126 });
      await expect(hasStations()).resolves.toBe(true);
    });

    it('retorna false quando o banco está vazio', async () => {
      db.getFirstAsync.mockResolvedValue({ count: 0 });
      await expect(hasStations()).resolves.toBe(false);
    });
  });
});
