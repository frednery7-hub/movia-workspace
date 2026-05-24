/**
 * Confidence Score Engine
 *
 * Unica fonte da verdade para calculo de confianca de posicionamento.
 * Consumido por mobile (InertialService) e backend (GeoService).
 * Retorna score de 0.0 a 1.0.
 */

export interface ConfidenceInput {
  accuracyMeters: number; // EPE do GPS
  isStationary: boolean; // veredito da janela inercial
  speedMetersPerSecond: number | null;
  fallbackActivated: boolean; // ancora fantasma detectada pelo SpeedGate
  provider: "GPS" | "NETWORK" | "FUSED" | "PASSIVE";
}

export interface ConfidenceOutput {
  score: number; // 0.0 – 1.0
  mode: NavigationMode;
  breakdown: ScoreBreakdown;
}

export type NavigationMode =
  | "NORMAL" // > 0.85 — GPS primario, navegacao fluida
  | "HYBRID" // 0.60 – 0.85 — inércia ativa, GPS fraco
  | "DEGRADED" // 0.30 – 0.59 — sem GPS, navegacao por inércia e tempo
  | "EMERGENCY"; // < 0.30 — falha total de sensores

export interface ScoreBreakdown {
  gpsWeight: number;
  providerWeight: number;
  motionWeight: number;
  penaltyWeight: number;
}

/** Thresholds de modo — Single Source of Truth para mobile e backend. */
export const NAVIGATION_THRESHOLDS = {
  NORMAL: 0.85,
  HYBRID: 0.6,
  DEGRADED: 0.3,
} as const;

/** Politicas de qualidade por contexto operacional. */
export const QUALITY_POLICIES = {
  SURFACE: {
    maxAccuracyMeters: 50,
    maxAgeMs: 5_000,
    minSpeedForMotionMs: 0.5,
  },
  UNDERGROUND: {
    maxAccuracyMeters: 120, // túneis toleram GPS degradado
    maxAgeMs: 8_000,
    minSpeedForMotionMs: 0.3,
  },
} as const;

export function computeConfidenceScore(
  input: ConfidenceInput,
): ConfidenceOutput {
  // ── GPS Weight (0.0 – 0.50) ──────────────────────────────────
  // Decai linearmente de 50m a 200m de imprecisao
  const gpsWeight = Math.max(0, 0.5 * (1 - (input.accuracyMeters - 50) / 150));

  // ── Provider Weight (0.0 – 0.20) ─────────────────────────────
  const providerWeight =
    input.provider === "GPS"
      ? 0.2
      : input.provider === "FUSED"
        ? 0.15
        : input.provider === "NETWORK"
          ? 0.05
          : 0.0;

  // ── Motion Coherence Weight (0.0 – 0.20) ─────────────────────
  // Se inércia diz parado mas GPS diz andando (ou vice-versa),
  // há incoerencia — penaliza
  const speedIsCoherent =
    input.speedMetersPerSecond === null ||
    (input.isStationary && input.speedMetersPerSecond < 0.5) ||
    (!input.isStationary && input.speedMetersPerSecond >= 0.5);

  const motionWeight = speedIsCoherent ? 0.2 : 0.05;

  // ── Penalty Weight (ancora fantasma) ─────────────────────────
  const penaltyWeight = input.fallbackActivated ? -0.15 : 0.0;

  // ── Score Final ───────────────────────────────────────────────
  const raw = gpsWeight + providerWeight + motionWeight + penaltyWeight;
  const score = Math.min(1.0, Math.max(0.0, raw));

  return {
    score,
    mode: resolveMode(score),
    breakdown: { gpsWeight, providerWeight, motionWeight, penaltyWeight },
  };
}

function resolveMode(score: number): NavigationMode {
  if (score >= NAVIGATION_THRESHOLDS.NORMAL) return "NORMAL";
  if (score >= NAVIGATION_THRESHOLDS.HYBRID) return "HYBRID";
  if (score >= NAVIGATION_THRESHOLDS.DEGRADED) return "DEGRADED";
  return "EMERGENCY";
}
