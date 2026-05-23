import type { DeviceLocation } from "@movia/shared-types";
import { haversineMeters } from "./haversine.ts";

export const MAX_PHYSICAL_SPEED_MS = 8; // m/s (~29 km/h)
export const ANCHOR_RESET_THRESHOLD = 3;

export interface SpeedGateResult {
  validPings: DeviceLocation[];
  anchorReset: boolean;
  droppedCount: number;
}

/**
 * Aplica Speed Gate com Reset Threshold sobre janela de pings.
 *
 * Cenário Âncora Fantasma:
 *   pingA = reflexo de cânion (vira âncora inicial)
 *   pingB/C/D = coordenadas reais (rejeitadas por alta velocidade)
 *   Após ANCHOR_RESET_THRESHOLD rejeições consecutivas:
 *     → âncora declarada fantasma
 *     → último ping rejeitado vira Ground Truth
 *     → histórico zerado e reconstruído
 */
export function applySpeedGate(
  pings: DeviceLocation[],
  maxSpeedMs = MAX_PHYSICAL_SPEED_MS,
  resetThreshold = ANCHOR_RESET_THRESHOLD,
): SpeedGateResult {
  if (pings.length === 0) {
    return { validPings: [], anchorReset: false, droppedCount: 0 };
  }

  const valid: DeviceLocation[] = [pings[0]];
  let anchor = pings[0];
  let consecutiveRejections = 0;
  let lastRejected: DeviceLocation | null = null;
  let anchorReset = false;
  let droppedCount = 0;

  for (let i = 1; i < pings.length; i++) {
    const ping = pings[i];
    const deltaMs = ping.hardwareTimestampMs - anchor.hardwareTimestampMs;

    if (deltaMs <= 0) continue; // anomalia de relógio

    const distMeters = haversineMeters(
      anchor.latitude,
      anchor.longitude,
      ping.latitude,
      ping.longitude,
    );
    const speedMs = distMeters / (deltaMs / 1000);

    if (speedMs <= maxSpeedMs) {
      valid.push(ping);
      anchor = ping;
      consecutiveRejections = 0;
      lastRejected = null;
    } else {
      droppedCount++;
      consecutiveRejections++;
      lastRejected = ping;

      if (consecutiveRejections >= resetThreshold && lastRejected !== null) {
        // Inversão de probabilidade — âncora é o fantasma
        anchor = lastRejected;
        valid.length = 0;
        valid.push(anchor);
        consecutiveRejections = 0;
        lastRejected = null;
        anchorReset = true;
      }
    }
  }

  return { validPings: valid, anchorReset, droppedCount };
}
