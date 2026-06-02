import { GtfsAdapter } from './gtfs.adapter';
import { LineStatus } from '@prisma/client';
import { transit_realtime } from 'gtfs-realtime-bindings';
import type { IngestionSource } from '../source-registry';

const TEST_SOURCE: IngestionSource = {
  id: 'src_test',
  type: 'GTFS_RT',
  url: 'https://test.example.com/gtfs-rt',
  timeoutSeconds: 10,
} as unknown as IngestionSource;

function buildFeedBuffer(
  entities: transit_realtime.IFeedEntity[],
): ArrayBuffer {
  const feed = transit_realtime.FeedMessage.create({
    header: {
      gtfsRealtimeVersion: '2.0',
      timestamp: Math.floor(Date.now() / 1000),
    },
    entity: entities,
  });
  const bytes = transit_realtime.FeedMessage.encode(feed).finish();
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function buildAlert(
  cause: transit_realtime.Alert.Cause,
  routeId: string,
  descText = '',
  headerText = 'Alerta de teste',
): transit_realtime.IFeedEntity {
  return {
    id: `entity_${routeId}`,
    alert: {
      cause,
      informedEntity: [{ routeId }],
      descriptionText: { translation: [{ text: descText, language: 'pt' }] },
      headerText: { translation: [{ text: headerText, language: 'pt' }] },
    },
  };
}

function mockFetch(buffer: ArrayBuffer, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    arrayBuffer: () => Promise.resolve(buffer),
  });
}

describe('GtfsAdapter', () => {
  let adapter: GtfsAdapter;

  beforeEach(() => {
    adapter = new GtfsAdapter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Mapeamento de causa → status ───────────────────────────────────────────

  it('GTFS.1 — TECHNICAL_PROBLEM mapeia para FAULTY', async () => {
    mockFetch(
      buildFeedBuffer([
        buildAlert(transit_realtime.Alert.Cause.TECHNICAL_PROBLEM, 'L1'),
      ]),
    );
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe(LineStatus.FAULTY);
    expect(events[0].lineId).toBe('L1');
  });

  it('GTFS.2 — ACCIDENT mapeia para FAULTY', async () => {
    mockFetch(
      buildFeedBuffer([
        buildAlert(transit_realtime.Alert.Cause.ACCIDENT, 'L2'),
      ]),
    );
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events[0].status).toBe(LineStatus.FAULTY);
  });

  it('GTFS.3 — STRIKE mapeia para SUSPENDED', async () => {
    mockFetch(
      buildFeedBuffer([buildAlert(transit_realtime.Alert.Cause.STRIKE, 'L3')]),
    );
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events[0].status).toBe(LineStatus.SUSPENDED);
  });

  it('GTFS.4 — MAINTENANCE mapeia para DELAYED', async () => {
    mockFetch(
      buildFeedBuffer([
        buildAlert(transit_realtime.Alert.Cause.MAINTENANCE, 'L4'),
      ]),
    );
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events[0].status).toBe(LineStatus.DELAYED);
  });

  // ── Extração de delay ──────────────────────────────────────────────────────

  it("GTFS.5 — extrai delay de descricao com '15 min' → 900s", async () => {
    mockFetch(
      buildFeedBuffer([
        buildAlert(
          transit_realtime.Alert.Cause.MAINTENANCE,
          'L1',
          'Atraso de 15 min esperado',
        ),
      ]),
    );
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events[0].delaySeconds).toBe(900);
  });

  it("GTFS.6 — extrai delay com variante 'minuto' → correto", async () => {
    mockFetch(
      buildFeedBuffer([
        buildAlert(
          transit_realtime.Alert.Cause.MAINTENANCE,
          'L1',
          'Retraso de 10 minuto',
        ),
      ]),
    );
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events[0].delaySeconds).toBe(600);
  });

  it('GTFS.7 — descricao sem padrão de delay retorna 0s', async () => {
    mockFetch(
      buildFeedBuffer([
        buildAlert(
          transit_realtime.Alert.Cause.MAINTENANCE,
          'L1',
          'Operação interrompida',
        ),
      ]),
    );
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events[0].delaySeconds).toBe(0);
  });

  // ── Resiliência ────────────────────────────────────────────────────────────

  it('GTFS.8 — feed sem entidades retorna array vazio', async () => {
    mockFetch(buildFeedBuffer([]));
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events).toHaveLength(0);
  });

  it('GTFS.9 — HTTP 404 retorna array vazio sem lançar erro', async () => {
    mockFetch(buildFeedBuffer([]), false, 404);
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events).toHaveLength(0);
  });

  it('GTFS.10 — buffer corrompido retorna array vazio sem lançar erro', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), // bytes invalidos
    });
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events).toHaveLength(0);
  });

  it('GTFS.11 — fetch timeout/erro de rede retorna array vazio', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('AbortError'));
    const events = await adapter.fetch(TEST_SOURCE);
    expect(events).toHaveLength(0);
  });
});
