import {
  ACTIVE_TRIP_CACHE_TTL_MS,
  clearActiveTripCache,
  getActiveTripCache,
  type ActiveTripCache,
} from './activeTripCache';
import {
  checkForResumableTrip,
  decideTripResume,
  declineTripResume,
} from './tripResume';

jest.mock('./activeTripCache', () => ({
  ...jest.requireActual('./activeTripCache'),
  getActiveTripCache: jest.fn(),
  clearActiveTripCache: jest.fn(),
}));

const mockGet = jest.mocked(getActiveTripCache);
const mockClear = jest.mocked(clearActiveTripCache);

const NOW = new Date('2026-07-12T15:00:00.000Z');

function makeCache(overrides: Partial<ActiveTripCache> = {}): ActiveTripCache {
  return {
    routeId: 'route_1',
    startedAt: '2026-07-12T14:30:00.000Z',
    lastUpdatedAt: '2026-07-12T14:50:00.000Z', // 10 min atrás
    routeSnapshot: {
      destination: 'Baquedano',
      path: [{ id: 'st_bio_bio' }, { id: 'st_nuble' }],
    },
    progressState: {} as never,
    phase: 'traveling' as never,
    firedNoticeIds: [],
    ...overrides,
  };
}

describe('decideTripResume', () => {
  it('sem cache: não oferece nada', () => {
    expect(decideTripResume(null, NOW)).toEqual({ kind: 'none' });
  });

  it('cache recente com rota: oferece a retomada', () => {
    const cache = makeCache();
    const decision = decideTripResume(cache, NOW);

    expect(decision.kind).toBe('offer');
    if (decision.kind === 'offer') {
      expect(decision.cache).toBe(cache);
      expect(decision.ageMs).toBe(10 * 60 * 1000); // 10 minutos
    }
  });

  it('cache expirado (além do TTL): não oferece', () => {
    // Não faz sentido oferecer a retomada de uma viagem de ontem.
    const expired = makeCache({
      lastUpdatedAt: new Date(
        NOW.getTime() - ACTIVE_TRIP_CACHE_TTL_MS - 1000,
      ).toISOString(),
    });

    expect(decideTripResume(expired, NOW)).toEqual({ kind: 'none' });
  });

  it('cache no limite do TTL ainda é oferecido', () => {
    const atLimit = makeCache({
      lastUpdatedAt: new Date(
        NOW.getTime() - ACTIVE_TRIP_CACHE_TTL_MS + 1000,
      ).toISOString(),
    });

    expect(decideTripResume(atLimit, NOW).kind).toBe('offer');
  });

  it('cache do futuro (relógio do aparelho mudou): não oferece', () => {
    // Fuso horário alterado ou relógio ajustado geraria idade negativa.
    const future = makeCache({
      lastUpdatedAt: new Date(NOW.getTime() + 60_000).toISOString(),
    });

    expect(decideTripResume(future, NOW)).toEqual({ kind: 'none' });
  });

  it('snapshot sem rota: não oferece (não há o que restaurar)', () => {
    const noPath = makeCache({
      routeSnapshot: { destination: 'Baquedano', path: [] },
    });

    expect(decideTripResume(noPath, NOW)).toEqual({ kind: 'none' });
  });

  it('data inválida no cache: não oferece', () => {
    const broken = makeCache({ lastUpdatedAt: 'não é uma data' });
    expect(decideTripResume(broken, NOW)).toEqual({ kind: 'none' });
  });
});

describe('checkForResumableTrip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClear.mockResolvedValue(undefined);
  });

  it('cache válido: oferece e NÃO limpa', async () => {
    mockGet.mockResolvedValue(makeCache());

    const decision = await checkForResumableTrip(NOW);

    expect(decision.kind).toBe('offer');
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('cache expirado: não oferece e LIMPA', async () => {
    mockGet.mockResolvedValue(
      makeCache({
        lastUpdatedAt: new Date(
          NOW.getTime() - ACTIVE_TRIP_CACHE_TTL_MS - 1000,
        ).toISOString(),
      }),
    );

    const decision = await checkForResumableTrip(NOW);

    expect(decision.kind).toBe('none');
    // Um cache morto não fica ocupando espaço nem é reavaliado a cada boot.
    expect(mockClear).toHaveBeenCalled();
  });

  it('sem cache: não oferece e não tenta limpar', async () => {
    mockGet.mockResolvedValue(null);

    const decision = await checkForResumableTrip(NOW);

    expect(decision.kind).toBe('none');
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('cache corrompido: o app abre normalmente', async () => {
    // Uma falha ao ler o cache não pode travar o boot.
    mockGet.mockRejectedValue(new Error('cache corrompido'));

    await expect(checkForResumableTrip(NOW)).resolves.toEqual({ kind: 'none' });
  });
});

describe('declineTripResume', () => {
  it('recusar limpa o cache', async () => {
    mockClear.mockResolvedValue(undefined);
    await declineTripResume();
    expect(mockClear).toHaveBeenCalled();
  });

  it('falha ao limpar não propaga', async () => {
    mockClear.mockRejectedValue(new Error('storage indisponível'));
    await expect(declineTripResume()).resolves.toBeUndefined();
  });
});
