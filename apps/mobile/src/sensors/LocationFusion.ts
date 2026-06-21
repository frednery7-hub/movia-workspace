import { NavigationStateMachine, applySpeedGate } from '@movia/geo-engine';
import type { StateMachineInput, StateMachineOutput } from '@movia/geo-engine';
import type { DeviceLocation } from '@movia/shared-types';
import type { InertialVerdict } from './InertialService.ts';

/**
 * LocationFusion — orquestrador de sensores no dispositivo.
 *
 * Combina:
 *   - Leitura GPS (expo-location)
 *   - Veredito inercial (InertialService)
 *   - Speed Gate / deteccao de ancora fantasma (@movia/geo-engine)
 *
 * Produz o payload enriquecido que sera enviado ao backend
 * via JWT apos cada leitura de posicao.
 */

export interface RawGpsReading {
  latitude:             number;
  longitude:            number;
  accuracyMeters:       number;
  altitudeMeters:       number | null;
  altitudeAccuracyMeters: number | null;
  headingDegrees:       number | null;
  speedMetersPerSecond: number | null;
  hardwareTimestampMs:  number;
  provider:             'GPS' | 'NETWORK' | 'FUSED' | 'PASSIVE';
}

export interface FusedLocationPayload {
  // Posicao
  latitude:             number;
  longitude:            number;
  accuracyMeters:       number;
  hardwareTimestampMs:  number;
  // Veredito inercial (processado na borda)
  isStationary:         boolean;
  inertialVariance:     number;
  // Estado de navegacao
  confidenceScore:      number;
  navigationMode:       string;
  isDegraded:           boolean;
  // Speed Gate
  fallbackActivated:    boolean;
  // Metadados
  provider:             string;
  samplesInWindow:      number;
}

/**
 * Janela de retencao dos pings brutos usados pelo Speed Gate para detectar
 * ancora fantasma. 60s comporta confortavelmente as ANCHOR_RESET_THRESHOLD
 * (3) rejeicoes consecutivas mesmo em intervalos de leitura mais espacados.
 */
export const SPEED_GATE_WINDOW_RETENTION_MS = 60_000;

function toDeviceLocation(gps: RawGpsReading): DeviceLocation {
  return {
    latitude:               gps.latitude,
    longitude:              gps.longitude,
    altitudeMeters:         gps.altitudeMeters,
    accuracyMeters:         gps.accuracyMeters,
    altitudeAccuracyMeters: gps.altitudeAccuracyMeters,
    headingDegrees:         gps.headingDegrees,
    speedMetersPerSecond:   gps.speedMetersPerSecond,
    hardwareTimestampMs:    gps.hardwareTimestampMs,
    provider:               gps.provider,
  };
}

export class LocationFusion {
  private readonly stateMachine = new NavigationStateMachine();
  private pingWindow: DeviceLocation[] = [];

  /**
   * Processa uma leitura GPS + veredito inercial.
   * Retorna o payload pronto para envio ao backend.
   */
  fuse(
    gps:     RawGpsReading,
    inertia: InertialVerdict,
  ): FusedLocationPayload {
    const ping = toDeviceLocation(gps);

    const prunedWindow = this.pingWindow.filter(
      (p) => ping.hardwareTimestampMs - p.hardwareTimestampMs <= SPEED_GATE_WINDOW_RETENTION_MS,
    );
    const fullWindow = [...prunedWindow, ping];
    const { validPings, anchorReset } = applySpeedGate(fullWindow);
    // Sem reset: mantem o historico bruto (inclusive rejeicoes) para que
    // a proxima chamada consiga recontar corretamente as rejeicoes
    // consecutivas. Com reset: a ancora fantasma foi resolvida, entao
    // reinicia a janela a partir do estado limpo (validPings).
    this.pingWindow = anchorReset ? validPings : fullWindow;

    const input: StateMachineInput = {
      accuracyMeters:       gps.accuracyMeters,
      isStationary:         inertia.isStationary,
      speedMetersPerSecond: gps.speedMetersPerSecond,
      fallbackActivated:    anchorReset,
      provider:             gps.provider,
      timestampMs:          gps.hardwareTimestampMs,
    };
    const state: StateMachineOutput = this.stateMachine.process(input);

    return {
      latitude:            gps.latitude,
      longitude:           gps.longitude,
      accuracyMeters:      gps.accuracyMeters,
      hardwareTimestampMs: gps.hardwareTimestampMs,
      isStationary:        inertia.isStationary,
      inertialVariance:    inertia.variance,
      confidenceScore:     state.score,
      navigationMode:      state.mode,
      isDegraded:          state.mode === 'DEGRADED' || state.mode === 'EMERGENCY',
      fallbackActivated:   anchorReset,
      provider:            gps.provider,
      samplesInWindow:     inertia.samplesInWindow,
    };
  }

  getCurrentMode(): string {
    return this.stateMachine.getCurrentMode();
  }

  reset(): void {
    this.stateMachine.reset();
    this.pingWindow = [];
  }
}
