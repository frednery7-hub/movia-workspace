"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtaEngine = void 0;
// ── Constantes operacionais ───────────────────────────────────────
const DWELL_TIME_SECONDS = 20; // tempo de parada por estacao
const SPEED_PENALTY_DELAYED = 1.5; // malha em atraso
const DEFAULT_SPEED_MS = 11.1; // ~40 km/h velocidade nominal metro
// ── Mapeamento de status para penalidade ─────────────────────────
const STATUS_WEIGHT = {
    NORMAL: 1.0,
    DELAYED: SPEED_PENALTY_DELAYED,
    FAULTY: Infinity,
};
class EtaEngine {
    compute(input) {
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
    computeSegmentSeconds(edge) {
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
    extractLineId(edge) {
        if (edge.type === "TRACK")
            return edge.lineId;
        return null;
    }
    computeConfidence(penalty, transfers) {
        // Penalidade de 1.5 reduz confianca para 0.6
        // Cada baldeacao reduz 0.05
        const penaltyFactor = 1 / penalty;
        const transferPenalty = transfers * 0.05;
        return Math.max(0, Math.min(1, penaltyFactor - transferPenalty));
    }
}
exports.EtaEngine = EtaEngine;
//# sourceMappingURL=eta-engine.js.map