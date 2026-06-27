import {
  EtaEngine,
  TRANSFER_WAIT_EXPECTED_SECONDS,
  TRANSFER_WAIT_MAX_SECONDS,
  TRANSFER_WAIT_MIN_SECONDS,
} from "../eta-engine.ts";
import type { RouteResult, RouteSegment, GraphNode } from "@movia/shared-types";

function makeNode(id: string, stationId: string): GraphNode {
  return {
    id,
    stationId,
    lineId: "L1",
    latitude: -33.4385,
    longitude: -70.6374,
    accessible: true,
  };
}

function makeRoute(segmentCount: number, lineId = "L1"): RouteResult {
  const segments: RouteSegment[] = [];

  for (let i = 0; i < segmentCount; i++) {
    segments.push({
      edge: {
        id: `seg_${i}`,
        type: "TRACK",
        fromNodeId: `node_${i}`,
        toNodeId: `node_${i + 1}`,
        cost: 90,
        accessible: true,
        lineId,
        direction: "INBOUND",
        distanceMeters: 1000,
        sequence: i,
        timeProfiles: [],
      },
      fromNode: makeNode(`node_${i}`, `st_${i}`),
      toNode: makeNode(`node_${i + 1}`, `st_${i + 1}`),
      cumulativeCost: (i + 1) * 90,
    });
  }

  return {
    segments,
    totalCost: segmentCount * 90,
    totalDurationSeconds: segmentCount * 90,
    totalDistanceMeters: segmentCount * 1000,
    transferCount: 0,
    accessible: true,
  };
}

function makeRouteWithTransfers(transferCount: number): RouteResult {
  const segments: RouteSegment[] = [];
  let cumulativeCost = 0;

  segments.push({
    edge: {
      id: "track_start",
      type: "TRACK",
      fromNodeId: "node_start",
      toNodeId: "node_before_transfer",
      cost: 90,
      accessible: true,
      lineId: "L1",
      direction: "INBOUND",
      distanceMeters: 1000,
      sequence: 0,
      timeProfiles: [],
    },
    fromNode: makeNode("node_start", "st_start"),
    toNode: makeNode("node_before_transfer", "st_transfer_0"),
    cumulativeCost: (cumulativeCost += 90),
  });

  for (let i = 0; i < transferCount; i++) {
    segments.push({
      edge: {
        id: `transfer_${i}`,
        type: "TRANSFER",
        fromNodeId: `transfer_from_${i}`,
        toNodeId: `transfer_to_${i}`,
        walkingSeconds: 120,
        platformChange: true,
        cost: 120,
        accessible: true,
      },
      fromNode: makeNode(`transfer_from_${i}`, `st_transfer_${i}`),
      toNode: makeNode(`transfer_to_${i}`, `st_transfer_${i}`),
      cumulativeCost: (cumulativeCost += 120),
    });
  }

  segments.push({
    edge: {
      id: "track_end",
      type: "TRACK",
      fromNodeId: "node_after_transfer",
      toNodeId: "node_end",
      cost: 90,
      accessible: true,
      lineId: "L2",
      direction: "INBOUND",
      distanceMeters: 1000,
      sequence: 1,
      timeProfiles: [],
    },
    fromNode: makeNode("node_after_transfer", "st_after_transfer"),
    toNode: makeNode("node_end", "st_end"),
    cumulativeCost: (cumulativeCost += 90),
  });

  return {
    segments,
    totalCost: cumulativeCost,
    totalDurationSeconds: cumulativeCost,
    totalDistanceMeters: 2000,
    transferCount,
    accessible: true,
  };
}

describe("EtaEngine", () => {
  const engine = new EtaEngine();

  it("ETA.1 — calcula corretamente rota de 3 segmentos normais", () => {
    const route = makeRoute(3);
    const result = engine.compute({ route, lineStatuses: { L1: "NORMAL" } });

    // 3 segmentos x (1000m / 11.1 m/s + 20s dwell) x 1.0 penalty
    const expectedPerSegment = 1000 / 11.1 + 20;
    const expectedTotal = Math.round(expectedPerSegment * 3);

    expect(result.etaSeconds).toBe(expectedTotal);
    expect(result.routeDegraded).toBe(false);
    expect(result.penaltyApplied).toBe(1.0);
    expect(result.confidence).toBeCloseTo(1.0, 1);
  });

  it("ETA.2 — aplica penalidade de 1.5x em linha DELAYED", () => {
    const route = makeRoute(3);
    const normal = engine.compute({ route, lineStatuses: { L1: "NORMAL" } });
    const delayed = engine.compute({ route, lineStatuses: { L1: "DELAYED" } });

    expect(delayed.etaSeconds).toBeGreaterThan(normal.etaSeconds);
    expect(delayed.etaSeconds).toBeCloseTo(normal.etaSeconds * 1.5, 0);
    expect(delayed.routeDegraded).toBe(true);
    expect(delayed.penaltyApplied).toBe(1.5);
  });

  it("ETA.3 — retorna Infinity em linha FAULTY", () => {
    const route = makeRoute(3);
    const result = engine.compute({ route, lineStatuses: { L1: "FAULTY" } });

    expect(result.etaSeconds).toBe(Infinity);
    expect(result.routeDegraded).toBe(true);
    expect(result.confidence).toBe(0);
  });

  it("ETA.4 — rota vazia retorna zero segundos", () => {
    const route: RouteResult = {
      segments: [],
      totalCost: 0,
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
      transferCount: 0,
      accessible: true,
    };
    const result = engine.compute({ route, lineStatuses: {} });
    expect(result.etaSeconds).toBe(0);
    expect(result.routeDegraded).toBe(false);
  });

  it("não soma espera de transferência em rota sem baldeação", () => {
    const result = engine.compute({
      route: makeRoute(2),
      lineStatuses: { L1: "NORMAL" },
    });

    expect(result.breakdown.transferWaitSeconds).toBe(0);
  });

  it("soma 3 minutos de espera esperada para 1 baldeação", () => {
    const result = engine.compute({
      route: makeRouteWithTransfers(1),
      lineStatuses: { L1: "NORMAL", L2: "NORMAL" },
    });

    expect(result.breakdown.transferWaitSeconds).toBe(
      TRANSFER_WAIT_EXPECTED_SECONDS,
    );
    expect(result.breakdown.minTotalSeconds).toBe(
      result.breakdown.totalSeconds -
        TRANSFER_WAIT_EXPECTED_SECONDS +
        TRANSFER_WAIT_MIN_SECONDS,
    );
    expect(result.breakdown.maxTotalSeconds).toBe(
      result.breakdown.totalSeconds -
        TRANSFER_WAIT_EXPECTED_SECONDS +
        TRANSFER_WAIT_MAX_SECONDS,
    );
  });

  it("soma 6 minutos de espera esperada para 2 baldeações", () => {
    const result = engine.compute({
      route: makeRouteWithTransfers(2),
      lineStatuses: { L1: "NORMAL", L2: "NORMAL" },
    });

    expect(result.breakdown.transferWaitSeconds).toBe(
      TRANSFER_WAIT_EXPECTED_SECONDS * 2,
    );
  });
});
