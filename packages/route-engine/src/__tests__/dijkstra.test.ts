import { RouteEngine } from "../route-engine";
import type {
  WeightedGraph,
  GraphNode,
  GraphEdge,
  TrackEdge,
  TransferEdge,
  NearestEntranceResult,
} from "@movia/shared-types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(
  platformId: string,
  stationId: string,
  lineId: string,
): GraphNode {
  return {
    id: platformId,
    stationId,
    lineId,
    latitude: -33.44,
    longitude: -70.63,
    accessible: true,
  };
}

function makeTrackEdge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  lineId: string,
  cost: number,
): TrackEdge {
  return {
    id,
    type: "TRACK",
    fromNodeId,
    toNodeId,
    cost,
    accessible: true,
    lineId,
    direction: "INBOUND",
    distanceMeters: 1000,
    sequence: 0,
    timeProfiles: [],
  };
}

function makeTransferEdge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  walkingSeconds: number,
): TransferEdge {
  return {
    id,
    type: "TRANSFER",
    fromNodeId,
    toNodeId,
    cost: walkingSeconds + TRANSFER_PENALTY,
    accessible: true,
    walkingSeconds,
    platformChange: true,
  };
}

function makeOrigin(stationId: string): NearestEntranceResult {
  return {
    stationId,
    entranceId: null,
    distanceMeters: 0,
    displacementVectorMeters: 0,
    fallbackActivated: false,
    locationUsed: {} as never,
    confidence: { nearestStationConfidence: 1, snappingConfidence: 1 },
  };
}

// ── Constantes ────────────────────────────────────────────────────────────────

const SEGMENT_COST = 90; // segundos por segmento (média real Metro Santiago)
const TRANSFER_WALK = 120; // walkingSeconds baldeação Tobalaba L4↔L1
const TRANSFER_PENALTY = 180; // penalidade fixa (GraphService / TransitGraphBuilder)

// IDs reais dos platforms (shared-data)
const PLT = {
  PUENTE_ALTO_L4: "plt_plaza_de_puente_alto_l4",
  MACUL_L4: "plt_macul_l4",
  QUILIN_L4: "plt_quilin_l4",
  SIMON_BOLIVAR_L4: "plt_simon_bolivar_l4",
  TOBALABA_L4: "plt_tobalaba_l4",
  TOBALABA_L1: "plt_tobalaba_l1",
  BAQUEDANO_L1: "plt_baquedano_l1",
  LOS_HEROES_L1: "plt_los_heroes_l1",
};

const STA = {
  PUENTE_ALTO: "st_plaza_de_puente_alto",
  MACUL: "st_macul",
  QUILIN: "st_quilin",
  SIMON_BOLIVAR: "st_simon_bolivar",
  TOBALABA: "st_tobalaba",
  BAQUEDANO: "st_baquedano",
  LOS_HEROES: "st_los_heroes",
};

// ── Grafo de teste ─────────────────────────────────────────────────────────────
//
//  L4 INBOUND (sul → norte):
//    plaza_de_puente_alto → macul → quilin → simon_bolivar → tobalaba
//
//  Baldeação bidirecional Tobalaba:
//    plt_tobalaba_l4 ↔ plt_tobalaba_l1  (120s walk + 180s penalty = 300s)
//
//  L1 INBOUND (leste → oeste):
//    tobalaba → baquedano → los_heroes

function buildTestGraph(): WeightedGraph {
  const nodes = new Map<string, GraphNode>([
    [PLT.PUENTE_ALTO_L4, makeNode(PLT.PUENTE_ALTO_L4, STA.PUENTE_ALTO, "L4")],
    [PLT.MACUL_L4, makeNode(PLT.MACUL_L4, STA.MACUL, "L4")],
    [PLT.QUILIN_L4, makeNode(PLT.QUILIN_L4, STA.QUILIN, "L4")],
    [
      PLT.SIMON_BOLIVAR_L4,
      makeNode(PLT.SIMON_BOLIVAR_L4, STA.SIMON_BOLIVAR, "L4"),
    ],
    [PLT.TOBALABA_L4, makeNode(PLT.TOBALABA_L4, STA.TOBALABA, "L4")],
    [PLT.TOBALABA_L1, makeNode(PLT.TOBALABA_L1, STA.TOBALABA, "L1")],
    [PLT.BAQUEDANO_L1, makeNode(PLT.BAQUEDANO_L1, STA.BAQUEDANO, "L1")],
    [PLT.LOS_HEROES_L1, makeNode(PLT.LOS_HEROES_L1, STA.LOS_HEROES, "L1")],
  ]);

  const trackEdges: TrackEdge[] = [
    makeTrackEdge(
      "seg_puente_alto_macul_in",
      PLT.PUENTE_ALTO_L4,
      PLT.MACUL_L4,
      "L4",
      SEGMENT_COST,
    ),
    makeTrackEdge(
      "seg_macul_quilin_in",
      PLT.MACUL_L4,
      PLT.QUILIN_L4,
      "L4",
      SEGMENT_COST,
    ),
    makeTrackEdge(
      "seg_quilin_simon_bolivar_in",
      PLT.QUILIN_L4,
      PLT.SIMON_BOLIVAR_L4,
      "L4",
      SEGMENT_COST,
    ),
    makeTrackEdge(
      "seg_simon_bolivar_tobalaba_in",
      PLT.SIMON_BOLIVAR_L4,
      PLT.TOBALABA_L4,
      "L4",
      SEGMENT_COST,
    ),
    makeTrackEdge(
      "seg_tobalaba_baquedano_in",
      PLT.TOBALABA_L1,
      PLT.BAQUEDANO_L1,
      "L1",
      SEGMENT_COST,
    ),
    makeTrackEdge(
      "seg_baquedano_los_heroes_in",
      PLT.BAQUEDANO_L1,
      PLT.LOS_HEROES_L1,
      "L1",
      SEGMENT_COST,
    ),
  ];

  const transferEdges: TransferEdge[] = [
    makeTransferEdge(
      "itf_tobalaba_l4_l1_fwd",
      PLT.TOBALABA_L4,
      PLT.TOBALABA_L1,
      TRANSFER_WALK,
    ),
    makeTransferEdge(
      "itf_tobalaba_l4_l1_rev",
      PLT.TOBALABA_L1,
      PLT.TOBALABA_L4,
      TRANSFER_WALK,
    ),
  ];

  const edges = new Map<string, GraphEdge[]>();
  for (const edge of [...trackEdges, ...transferEdges]) {
    const list = edges.get(edge.fromNodeId) ?? [];
    list.push(edge);
    edges.set(edge.fromNodeId, list);
  }

  return { nodes, edges, version: "test-v1" };
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("RouteEngine — Dijkstra", () => {
  let engine: RouteEngine;

  beforeEach(() => {
    engine = new RouteEngine(buildTestGraph());
  });

  it("DIJKSTRA.1 — L4 direto: Plaza de Puente Alto → Tobalaba (4 segmentos, sem baldeação)", () => {
    const result = engine.route({
      origin: makeOrigin(STA.PUENTE_ALTO),
      destination: makeOrigin(STA.TOBALABA),
    });

    expect(result).not.toBeNull();

    const track = result!.segments.filter((s) => s.edge.type === "TRACK");
    expect(track).toHaveLength(4);

    // Estação inicial e final corretas
    expect(track[0].fromNode.stationId).toBe(STA.PUENTE_ALTO);
    expect(track[track.length - 1].toNode.stationId).toBe(STA.TOBALABA);

    // Custo total: 4 × 90s = 360s
    expect(result!.totalCost).toBe(4 * SEGMENT_COST);
    expect(result!.transferCount).toBe(0);
  });

  it("DIJKSTRA.2 — Baldeação L4→L1: Plaza de Puente Alto → Baquedano (4+1 segmentos + transfer)", () => {
    const result = engine.route({
      origin: makeOrigin(STA.PUENTE_ALTO),
      destination: makeOrigin(STA.BAQUEDANO),
    });

    expect(result).not.toBeNull();
    expect(result!.transferCount).toBe(1);

    // Custo esperado: (4 × 90) + (120 + 180) + (1 × 90) = 750s
    const expectedCost =
      4 * SEGMENT_COST + (TRANSFER_WALK + TRANSFER_PENALTY) + SEGMENT_COST;
    expect(result!.totalCost).toBe(expectedCost);
  });

  it("DIJKSTRA.3 — Penalidade de 180s está somada corretamente ao custo de baldeação", () => {
    const result = engine.route({
      origin: makeOrigin(STA.PUENTE_ALTO),
      destination: makeOrigin(STA.BAQUEDANO),
    });

    const transferSeg = result!.segments.find(
      (s) => s.edge.type === "TRANSFER",
    );
    expect(transferSeg).toBeDefined();

    const edge = transferSeg!.edge as TransferEdge;
    expect(edge.cost).toBe(edge.walkingSeconds + 180);
    expect(edge.cost).toBe(TRANSFER_WALK + TRANSFER_PENALTY);
  });

  it("DIJKSTRA.4 — Dijkstra escolhe caminho mais curto (L4 direto < L4+transfer)", () => {
    const direct = engine.route({
      origin: makeOrigin(STA.PUENTE_ALTO),
      destination: makeOrigin(STA.TOBALABA),
    });
    const withTransfer = engine.route({
      origin: makeOrigin(STA.PUENTE_ALTO),
      destination: makeOrigin(STA.BAQUEDANO),
    });

    expect(direct!.totalCost).toBeLessThan(withTransfer!.totalCost);
  });

  it("DIJKSTRA.5 — Retorna null quando não há rota disponível", () => {
    const result = engine.route({
      origin: makeOrigin("st_estacao_isolada"),
      destination: makeOrigin(STA.TOBALABA),
    });

    expect(result).toBeNull();
  });

  it("DIJKSTRA.6 — Custo acumulado cresce monotonicamente ao longo do caminho", () => {
    const result = engine.route({
      origin: makeOrigin(STA.PUENTE_ALTO),
      destination: makeOrigin(STA.BAQUEDANO),
    });

    expect(result).not.toBeNull();

    let prevCumulative = 0;
    for (const seg of result!.segments) {
      expect(seg.cumulativeCost).toBeGreaterThanOrEqual(prevCumulative);
      prevCumulative = seg.cumulativeCost;
    }
  });
});
