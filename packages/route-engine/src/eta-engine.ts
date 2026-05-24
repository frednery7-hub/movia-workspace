import type { RouteResult, GraphEdge } from "@movia/shared-types";

/**
 * ETA Engine — Motor Preditivo de Tempo de Chegada.
 *
 * Formula:
 *   ETA = Σ (d_i / v_i + t_dwell) × W_status
 *
 * Onde:
 *   d_i      = distancia do segmento (metros)
 *   v_i      = velocidade operacional do segmento (m/s)
 *   t_dwell  = tempo de parada na estacao (segundos)
 *   W_status = penalidade de malha (1.0 normal, 1.5 atraso, recalculo em falha)
 */

export type LineStatus = "NORMAL" | "DELAYED" | "FAULTY";

export interface LineStatusMap {
  [lineId: string]: LineStatus;
}

export interface EtaInput {
  route: RouteResult;
  lineStatuses: LineStatusMap;
}

export interface EtaOutput {
  etaSeconds: number;
  arrivalTime: Date;
  confidence: number;
  routeDegraded: boolean;
  penaltyApplied: number;
}

// ── Constantes operacionais ───────────────────────────────────────
const DWELL_TIME_SECONDS = 20; // tempo de parada por estacao
const SPEED_PENALTY_DELAYED = 1.5; // malha em atraso
const DEFAULT_SPEED_MS = 11.1; // ~40 km/h velocidade nominal metro

// ── Mapeamento de status para penalidade ─────────────────────────
const STATUS_WEIGHT: Record<LineStatus, number> = {
  NORMAL: 1.0,
  DELAYED: SPEED_PENALTY_DELAYED,
  FAULTY: Infinity,
};

export class EtaEngine {
  compute(input: EtaInput): EtaOutput {
    const { route, lineStatuses } = input;

    let totalSeconds = 0;
    let routeDegraded = false;
    let maxPenalty = 1.0;

    for (const segment of route.segments) {
      const edge = segment.edge;

      // ── Tempo base do segmento ────────────────────────────────
      const segmentSeconds = this.computeSegmentSeconds(edge);

      // ── Penalidade da malha ───────────────────────────────────
      const lineId = this.extractLineId(edge);
      const status = lineId ? (lineStatuses[lineId] ?? "NORMAL") : "NORMAL";
      const weight = STATUS_WEIGHT[status];

      if (weight === Infinity) {
        // Falha critica — rota invalida, retorna ETA infinito
        return {
          etaSeconds: Infinity,
          arrivalTime: new Date(Date.now() + 999_999_999),
          confidence: 0,
          routeDegraded: true,
          penaltyApplied: Infinity,
        };
      }

      if (weight > 1.0) {
        routeDegraded = true;
        maxPenalty = Math.max(maxPenalty, weight);
      }

      // ── Dwell time apenas em arestas TRACK ───────────────────
      const dwellTime = edge.type === "TRACK" ? DWELL_TIME_SECONDS : 0;

      totalSeconds += (segmentSeconds + dwellTime) * weight;
    }

    const confidence = this.computeConfidence(maxPenalty, route.transferCount);

    return {
      etaSeconds: Math.round(totalSeconds),
      arrivalTime: new Date(Date.now() + totalSeconds * 1000),
      confidence,
      routeDegraded,
      penaltyApplied: maxPenalty,
    };
  }

  private computeSegmentSeconds(edge: GraphEdge): number {
    if (edge.type === "TRACK") {
      return edge.distanceMeters / DEFAULT_SPEED_MS;
    }
    if (edge.type === "WALK") {
      return edge.durationSeconds;
    }
    if (edge.type === "TRANSFER") {
      return edge.walkingSeconds;
    }
    return 0;
  }

  private extractLineId(edge: GraphEdge): string | null {
    if (edge.type === "TRACK") return edge.lineId;
    return null;
  }

  private computeConfidence(penalty: number, transfers: number): number {
    // Penalidade de 1.5 reduz confianca para 0.6
    // Cada baldeacao reduz 0.05
    const penaltyFactor = 1 / penalty;
    const transferPenalty = transfers * 0.05;
    return Math.max(0, Math.min(1, penaltyFactor - transferPenalty));
  }
}
