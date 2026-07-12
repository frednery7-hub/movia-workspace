import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheService } from './cache.service';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetItem = jest.mocked(AsyncStorage.getItem);
const mockSetItem = jest.mocked(AsyncStorage.setItem);
const mockRemoveItem = jest.mocked(AsyncStorage.removeItem);

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('hit', () => {
    it('devolve o dado quando ainda não expirou', async () => {
      const entry = {
        data: { stations: 126 },
        expiresAt: Date.now() + 60_000,
      };
      mockGetItem.mockResolvedValue(JSON.stringify(entry));

      await expect(CacheService.get('stations')).resolves.toEqual({
        stations: 126,
      });
      expect(mockRemoveItem).not.toHaveBeenCalled();
    });
  });

  describe('miss', () => {
    it('devolve null quando a chave não existe', async () => {
      mockGetItem.mockResolvedValue(null);
      await expect(CacheService.get('inexistente')).resolves.toBeNull();
    });

    it('devolve null (sem lançar) quando o conteúdo está corrompido', async () => {
      // Um cache corrompido não pode derrubar o app -- ele deve se
      // comportar como um miss e deixar o fluxo seguir para a rede.
      mockGetItem.mockResolvedValue('{ isso não é json válido');
      await expect(CacheService.get('corrompido')).resolves.toBeNull();
    });
  });

  describe('expiração', () => {
    it('devolve null e remove a entrada quando expirou', async () => {
      const entry = {
        data: { stations: 126 },
        expiresAt: Date.now() - 1_000, // já venceu
      };
      mockGetItem.mockResolvedValue(JSON.stringify(entry));

      await expect(CacheService.get('stations')).resolves.toBeNull();

      // Não basta ignorar: a entrada morta é removida para não ocupar espaço.
      expect(mockRemoveItem).toHaveBeenCalledWith('movia_cache_stations');
    });
  });

  describe('set', () => {
    it('grava com o TTL informado', async () => {
      const before = Date.now();
      await CacheService.set('lines', { lines: 7 }, 10_000);

      expect(mockSetItem).toHaveBeenCalledTimes(1);
      const [key, raw] = mockSetItem.mock.calls[0]!;
      expect(key).toBe('movia_cache_lines');

      const stored = JSON.parse(raw as string);
      expect(stored.data).toEqual({ lines: 7 });
      expect(stored.expiresAt).toBeGreaterThanOrEqual(before + 10_000);
    });

    it('falha de escrita não propaga (cache é best-effort)', async () => {
      // Se o AsyncStorage estiver cheio ou indisponível, o app continua:
      // cache é otimização, não requisito.
      mockSetItem.mockRejectedValue(new Error('storage cheio'));
      await expect(
        CacheService.set('lines', { lines: 7 }),
      ).resolves.toBeUndefined();
    });
  });
});
