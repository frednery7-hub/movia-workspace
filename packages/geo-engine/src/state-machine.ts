import { computeConfidenceScore } from "./confidence-score.ts";
import type {
  ConfidenceInput,
  ConfidenceOutput,
  NavigationMode,
} from "./confidence-score.ts";
/**
 * Maquina de Estados com Hysteresis.
 *
 * Impede o "efeito sanfona" — transicoes rapidas entre modos
 * causadas por flutuacoes momentaneas de sinal.
 *
 * Regra de Hysteresis:
 *   - Degradacao (NORMAL → HYBRID → DEGRADED → EMERGENCY):
 *     transita imediatamente ao primeiro ping ruim.
 *   - Recuperacao (EMERGENCY → DEGRADED → HYBRID → NORMAL):
 *     exige RECOVERY_THRESHOLD pings consecutivos bons
 *     antes de subir de modo.
 */

export const RECOVERY_THRESHOLD = 4; // pings consecutivos para subir de modo

export interface StateMachineInput extends ConfidenceInput {
  timestampMs: number;
}

export interface StateMachineOutput extends ConfidenceOutput {
  previousMode: NavigationMode;
  transitioned: boolean;
  consecutiveGoodPings: number;
}

export class NavigationStateMachine {
  private currentMode: NavigationMode = "NORMAL";
  private consecutiveGoodPings: number = 0;
  private lastTransitionMs: number = 0;

  /**
   * Processa um novo ping e decide se ha transicao de modo.
   * Chamado pelo LocationFusion no mobile a cada leitura de sensor.
   */
  process(input: StateMachineInput): StateMachineOutput {
    const result = computeConfidenceScore(input);
    const targetMode = result.mode;
    const previousMode = this.currentMode;
    let transitioned = false;

    if (this.isBetterMode(targetMode, this.currentMode)) {
      // ── Recuperacao — exige RECOVERY_THRESHOLD pings bons ────
      this.consecutiveGoodPings++;

      if (this.consecutiveGoodPings >= RECOVERY_THRESHOLD) {
        this.currentMode = targetMode;
        this.consecutiveGoodPings = 0;
        this.lastTransitionMs = input.timestampMs;
        transitioned = true;
      }
    } else if (this.isWorseMode(targetMode, this.currentMode)) {
      // ── Degradacao — transita imediatamente ──────────────────
      this.currentMode = targetMode;
      this.consecutiveGoodPings = 0;
      this.lastTransitionMs = input.timestampMs;
      transitioned = true;
    } else {
      // ── Modo estavel ─────────────────────────────────────────
      this.consecutiveGoodPings = 0;
    }

    return {
      ...result,
      mode: this.currentMode,
      previousMode,
      transitioned,
      consecutiveGoodPings: this.consecutiveGoodPings,
    };
  }

  getCurrentMode(): NavigationMode {
    return this.currentMode;
  }

  reset(): void {
    this.currentMode = "NORMAL";
    this.consecutiveGoodPings = 0;
    this.lastTransitionMs = 0;
  }

  // ── Helpers de comparacao de modo ────────────────────────────
  private modeRank(mode: NavigationMode): number {
    return { NORMAL: 3, HYBRID: 2, DEGRADED: 1, EMERGENCY: 0 }[mode];
  }

  private isBetterMode(
    target: NavigationMode,
    current: NavigationMode,
  ): boolean {
    return this.modeRank(target) > this.modeRank(current);
  }

  private isWorseMode(
    target: NavigationMode,
    current: NavigationMode,
  ): boolean {
    return this.modeRank(target) < this.modeRank(current);
  }
}
