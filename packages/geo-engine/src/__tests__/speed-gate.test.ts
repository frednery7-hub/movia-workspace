import { applySpeedGate, ANCHOR_RESET_THRESHOLD } from "../speed-gate.ts";
import type { DeviceLocation } from "@movia/shared-types";

function makePing(
  lat: number,
  lon: number,
  timestampMs: number,
  accuracyMeters = 15,
): DeviceLocation {
  return {
    latitude: lat,
    longitude: lon,
    altitudeMeters: null,
    altitudeAccuracyMeters: null,
    headingDegrees: null,
    speedMetersPerSecond: null,
    accuracyMeters,
    hardwareTimestampMs: timestampMs,
    provider: "GPS",
  };
}

describe("applySpeedGate", () => {
  it("aceita pings com velocidade dentro do limite", () => {
    const pings = [
      makePing(-33.4385, -70.6374, 0),
      makePing(-33.4384, -70.6373, 10000),
    ];
    const { validPings, droppedCount } = applySpeedGate(pings);
    expect(validPings).toHaveLength(2);
    expect(droppedCount).toBe(0);
  });

  it("descarta ping que implica velocidade impossivel", () => {
    const pings = [
      makePing(-33.4385, -70.6374, 0),
      makePing(-33.3978, -70.5698, 1000),
    ];
    const { validPings, droppedCount } = applySpeedGate(pings);
    expect(validPings).toHaveLength(1);
    expect(droppedCount).toBe(1);
  });

  it("CENARIO ANCORA FANTASMA: reset apos 3 rejeicoes consecutivas", () => {
    const ghostLat = -33.435;
    const ghostLon = -70.6374;
    const realLat = -33.4385;
    const realLon = -70.6374;

    const pings: DeviceLocation[] = [
      makePing(ghostLat, ghostLon, 0),
      makePing(realLat, realLon, 1000),
      makePing(realLat, realLon, 2000),
      makePing(realLat, realLon, 3000),
      makePing(-33.43851, realLon, 4000),
    ];

    const { validPings, anchorReset, droppedCount } = applySpeedGate(pings);

    expect(anchorReset).toBe(true);
    expect(droppedCount).toBe(ANCHOR_RESET_THRESHOLD);
    expect(validPings[0].hardwareTimestampMs).toBe(3000);
    expect(validPings[0].latitude).toBeCloseTo(realLat, 4);
    expect(validPings).toHaveLength(2);
  });

  it("retorna janela vazia para array vazio", () => {
    const { validPings } = applySpeedGate([]);
    expect(validPings).toHaveLength(0);
  });
});
