import {
  computeInertialFallback,
  mapTripEstimationModeToNavigationMode,
  pruneMotionSampleBuffer,
} from './inertialIntegration';

describe('mapTripEstimationModeToNavigationMode', () => {
  it('maps every TripEstimationMode to a NavigationMode', () => {
    expect(mapTripEstimationModeToNavigationMode('normal')).toBe('normal');
    expect(mapTripEstimationModeToNavigationMode('hybrid')).toBe('hybrid');
    expect(mapTripEstimationModeToNavigationMode('inertial')).toBe('inertial');
    expect(mapTripEstimationModeToNavigationMode('uncertain')).toBe('approximate');
  });
});

describe('pruneMotionSampleBuffer', () => {
  it('removes samples older than the retention window', () => {
    const now = 100_000;
    const buffer = [
      { timestamp: now - 11_000, motionState: 'stationary' as const },
      { timestamp: now - 5_000, motionState: 'stationary' as const },
    ];
    const pruned = pruneMotionSampleBuffer(buffer, now);
    expect(pruned).toHaveLength(1);
  });
});

describe('computeInertialFallback', () => {
  it('confirms station without GPS when time elapsed + stationary + sustained', () => {
    const now = 100_000;
    const buffer = [
      { timestamp: now - 6_000, motionState: 'stationary' as const },
      { timestamp: now - 3_000, motionState: 'stationary' as const },
    ];
    const result = computeInertialFallback({
      tripStatus: 'active',
      currentStationIndex: 2,
      destinationStationIndex: 5,
      routeStationCount: 6,
      gpsAvailable: false,
      isStationaryFromAccelerometer: true,
      speedMps: null,
      previousSpeedMps: null,
      motionSampleBuffer: buffer,
      secondsSinceLastConfirmedStation: 100,
      now,
    });
    expect(result.decision.shouldConfirmStation).toBe(true);
    expect(result.decision.estimatedStationIndex).toBe(3);
    expect(result.navigationMode).toBe('inertial');
  });

  it('only approaches (does not confirm) when braking without GPS', () => {
    const now = 100_000;
    const buffer = [
      { timestamp: now - 6_000, motionState: 'stationary' as const },
      { timestamp: now - 3_000, motionState: 'stationary' as const },
    ];
    const result = computeInertialFallback({
      tripStatus: 'active',
      currentStationIndex: 2,
      destinationStationIndex: 5,
      routeStationCount: 6,
      gpsAvailable: false,
      isStationaryFromAccelerometer: false,
      speedMps: 2,
      previousSpeedMps: 4,
      motionSampleBuffer: buffer,
      secondsSinceLastConfirmedStation: 100,
      now,
    });
    expect(result.decision.shouldConfirmStation).toBe(false);
  });

  it('does not advance more than one station', () => {
    const result = computeInertialFallback({
      tripStatus: 'active',
      currentStationIndex: 2,
      destinationStationIndex: 5,
      routeStationCount: 6,
      gpsAvailable: false,
      isStationaryFromAccelerometer: true,
      speedMps: null,
      previousSpeedMps: null,
      motionSampleBuffer: [],
      secondsSinceLastConfirmedStation: 9999,
    });
    expect(result.decision.estimatedStationIndex).not.toBeGreaterThan(3);
  });
});
