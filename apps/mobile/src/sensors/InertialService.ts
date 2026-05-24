import { Accelerometer } from 'expo-sensors';
import { QUALITY_POLICIES } from '@movia/geo-engine';

/**
 * InertialService — processamento de borda (Edge Computing).
 *
 * Toda a matematica de variancia ocorre no dispositivo.
 * O backend recebe apenas o veredito leve: { isStationary, variancia }.
 *
 * Sliding Window: buffer circular de 2-3 segundos de leituras IMU.
 * Variancia: σ² = Σ(xi - μ)² / N sobre magnitude dos eixos X, Y, Z.
 */

export interface ImuReading {
  x:           number;
  y:           number;
  z:           number;
  timestampMs: number;
}

export interface InertialVerdict {
  isStationary:   boolean;
  variance:       number;
  windowSizeMs:   number;
  samplesInWindow: number;
}

const WINDOW_DURATION_MS    = 2_500; // janela de 2.5 segundos
const STATIONARY_THRESHOLD  = 0.015; // variancia abaixo = parado

export class InertialService {
  private buffer: ImuReading[] = [];
  private subscription: ReturnType<typeof Accelerometer.addListener> | null = null;

  start(): void {
    Accelerometer.setUpdateInterval(100); // 10Hz — economico para bateria

    this.subscription = Accelerometer.addListener(({ x, y, z }) => {
      const reading: ImuReading = {
        x, y, z,
        timestampMs: Date.now(),
      };
      this.buffer.push(reading);
      this.evictStaleReadings();
    });
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.buffer       = [];
  }

  getVerdict(): InertialVerdict {
    this.evictStaleReadings();

    if (this.buffer.length < 3) {
      // Buffer insuficiente — assume movimento para nao bloquear navegacao
      return {
        isStationary:    false,
        variance:        999,
        windowSizeMs:    0,
        samplesInWindow: this.buffer.length,
      };
    }

    const magnitudes = this.buffer.map(r =>
      Math.sqrt(r.x ** 2 + r.y ** 2 + r.z ** 2),
    );

    const variance       = computeVariance(magnitudes);
    const isStationary   = variance < STATIONARY_THRESHOLD;
    const oldest         = this.buffer[0].timestampMs;
    const newest         = this.buffer[this.buffer.length - 1].timestampMs;

    return {
      isStationary,
      variance,
      windowSizeMs:    newest - oldest,
      samplesInWindow: this.buffer.length,
    };
  }

  private evictStaleReadings(): void {
    const cutoff = Date.now() - WINDOW_DURATION_MS;
    this.buffer  = this.buffer.filter(r => r.timestampMs >= cutoff);
  }
}

/** σ² = Σ(xi - μ)² / N */
function computeVariance(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

export const INERTIAL_QUALITY_POLICY = QUALITY_POLICIES;