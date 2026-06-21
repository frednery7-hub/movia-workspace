import { LocationFusion, type RawGpsReading, SPEED_GATE_WINDOW_RETENTION_MS } from './LocationFusion';
import type { InertialVerdict } from './InertialService';

function makeGps(
  latitude: number,
  longitude: number,
  hardwareTimestampMs: number,
  speedMetersPerSecond: number | null = null,
): RawGpsReading {
  return {
    latitude,
    longitude,
    accuracyMeters: 15,
    altitudeMeters: null,
    altitudeAccuracyMeters: null,
    headingDegrees: null,
    speedMetersPerSecond,
    hardwareTimestampMs,
    provider: 'GPS',
  };
}

function makeInertia(isStationary = false): InertialVerdict {
  return {
    isStationary,
    variance: isStationary ? 0.005 : 0.05,
    windowSizeMs: 2_500,
    samplesInWindow: 25,
  };
}

describe('LocationFusion — Speed Gate / ancora fantasma', () => {
  it('mantem fallbackActivated false em leituras normais', () => {
    const fusion = new LocationFusion();
    const a = fusion.fuse(makeGps(-33.4385, -70.6374, 0), makeInertia());
    const b = fusion.fuse(makeGps(-33.4384, -70.6373, 10_000), makeInertia());

    expect(a.fallbackActivated).toBe(false);
    expect(b.fallbackActivated).toBe(false);
  });

  it('CENARIO ANCORA FANTASMA: ativa fallbackActivated apos 3 rejeicoes consecutivas', () => {
    const fusion = new LocationFusion();
    const ghostLat = -33.0;
    const ghostLon = -70.0;
    const realLat = -33.5;
    const realLon = -70.5;

    const ghost = fusion.fuse(makeGps(ghostLat, ghostLon, 0), makeInertia());
    const r1 = fusion.fuse(makeGps(realLat, realLon, 10_000), makeInertia());
    const r2 = fusion.fuse(makeGps(realLat, realLon + 0.0001, 20_000), makeInertia());
    const r3 = fusion.fuse(makeGps(realLat, realLon + 0.0002, 30_000), makeInertia());

    expect(ghost.fallbackActivated).toBe(false);
    expect(r1.fallbackActivated).toBe(false);
    expect(r2.fallbackActivated).toBe(false);
    expect(r3.fallbackActivated).toBe(true);
  });

  it('depois do reset, a navegacao volta a aceitar leituras normalmente', () => {
    const fusion = new LocationFusion();
    fusion.fuse(makeGps(-33.0, -70.0, 0), makeInertia());
    fusion.fuse(makeGps(-33.5, -70.5, 10_000), makeInertia());
    fusion.fuse(makeGps(-33.5, -70.5001, 20_000), makeInertia());
    fusion.fuse(makeGps(-33.5, -70.5002, 30_000), makeInertia()); // reset aqui

    const after = fusion.fuse(makeGps(-33.5, -70.5003, 40_000), makeInertia());
    expect(after.fallbackActivated).toBe(false);
  });

  it('janela de retencao descarta pings antigos antes de avaliar velocidade', () => {
    const fusion = new LocationFusion();
    fusion.fuse(makeGps(-33.4385, -70.6374, 0), makeInertia());

    // Ping distante, mas chegando DEPOIS da janela de retencao —
    // a ancora antiga deve ter sido descartada antes da comparacao,
    // entao essa leitura se torna a nova ancora sem rejeicao.
    const afterRetention = fusion.fuse(
      makeGps(-33.4385, -70.5874, SPEED_GATE_WINDOW_RETENTION_MS + 10_000),
      makeInertia(),
    );

    expect(afterRetention.fallbackActivated).toBe(false);
  });

  it('reset() limpa a janela de pings junto com a maquina de estados', () => {
    const fusion = new LocationFusion();
    fusion.fuse(makeGps(-33.0, -70.0, 0), makeInertia());
    fusion.fuse(makeGps(-33.5, -70.5, 10_000), makeInertia());
    fusion.fuse(makeGps(-33.5, -70.5001, 20_000), makeInertia());

    fusion.reset();

    // Apos reset, a proxima leitura deve ser tratada como ancora nova —
    // sem rejeicoes acumuladas da sequencia anterior.
    const afterReset = fusion.fuse(makeGps(-33.5, -70.5002, 30_000), makeInertia());
    expect(afterReset.fallbackActivated).toBe(false);
  });
});
