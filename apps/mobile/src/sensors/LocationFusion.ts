import { NavigationStateMachine } from '@movia/geo-engine';
import type { StateMachineInput, StateMachineOutput } from '@movia/geo-engine';
import type { InertialVerdict } from './InertialService.ts';

/**
 * LocationFusion — orquestrador de sensores no dispositivo.
 *
 * Combina:
 *   - Leitura GPS (expo-location)
 *   - Veredito inercial (InertialService)
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

  // Metadados
  provider:             string;
  samplesInWindow:      number;
}

export class LocationFusion {
  private readonly stateMachine = new NavigationStateMachine();

  /**
   * Processa uma leitura GPS + veredito inercial.
   * Retorna o payload pronto para envio ao backend.
   */
  fuse(
    gps:     RawGpsReading,
    inertia: InertialVerdict,
  ): FusedLocationPayload {
    const input: StateMachineInput = {
      accuracyMeters:       gps.accuracyMeters,
      isStationary:         inertia.isStationary,
      speedMetersPerSecond: gps.speedMetersPerSecond,
      fallbackActivated:    false,
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
      provider:            gps.provider,
      samplesInWindow:     inertia.samplesInWindow,
    };
  }

  getCurrentMode(): string {
    return this.stateMachine.getCurrentMode();
  }

  reset(): void {
    this.stateMachine.reset();
  }
}