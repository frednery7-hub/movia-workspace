import {
  calculateInertialOnlyConfidence,
} from './confidenceScore';
import {
  estimateTripProgress,
  shouldReturnToBetweenStationsAfterDeparture,
} from './inertialTripEngine';
import {
  hasSustainedArrivalWindow,
  type MotionStateSample,
} from './sustainedArrivalWindow';
import type { InertialTripInput } from './types';

function input(overrides: Partial<InertialTripInput> = {}): InertialTripInput {
  return {
    tripStatus: 'active',
    currentStationIndex: 1,
    destinationStationIndex: 4,
    routeStationCount: 5,
    distanceToCurrentStationMeters: 400,
    distanceToNextStationMeters: 400,
    gpsAvailable: false,
    gpsAccuracyMeters: null,
    speedMps: null,
    secondsSinceLastConfirmedStation: 30,
    expectedSecondsToNextStation: 60,
    motionState: 'moving',
    hasSustainedArrivalWindow: false,
    ...overrides,
  };
}

describe('estimateTripProgress', () => {
  it('tripStatus preview não estima avanço', () => {
    expect(estimateTripProgress(input({ tripStatus: 'preview' }))).toMatchObject({
      mode: 'uncertain',
      shouldAdvanceVisualState: false,
      shouldConfirmStation: false,
      reason: 'trip-not-active',
    });
  });

  it('currentStationIndex null não avança', () => {
    expect(estimateTripProgress(input({ currentStationIndex: null }))).toMatchObject({
      estimatedStationIndex: null,
      nextStationIndex: null,
      shouldAdvanceVisualState: false,
      shouldConfirmStation: false,
      reason: 'missing-current-station-index',
    });
  });

  it('GPS confiável + <=50m + speed baixa confirma estação', () => {
    expect(estimateTripProgress(input({
      gpsAvailable: true,
      gpsAccuracyMeters: 20,
      distanceToNextStationMeters: 45,
      speedMps: 0.8,
    }))).toMatchObject({
      mode: 'normal',
      estimatedStationIndex: 2,
      shouldAdvanceVisualState: true,
      shouldConfirmStation: true,
      confidence: 1,
      reason: 'gps-reliable-arrival-confirmed',
    });
  });

  it('GPS confiável + <=150m antecipa visualmente', () => {
    expect(estimateTripProgress(input({
      gpsAvailable: true,
      gpsAccuracyMeters: 20,
      distanceToNextStationMeters: 120,
      speedMps: 5,
    }))).toMatchObject({
      mode: 'normal',
      estimatedStationIndex: 1,
      nextStationIndex: 2,
      shouldAdvanceVisualState: true,
      shouldConfirmStation: false,
      confidence: 0.75,
      reason: 'gps-reliable-approaching-next-station',
    });
  });

  it('GPS ausente + tempo cumprido + braking + janela sustentada = 0.7, só aproxima', () => {
    const tripInput = input({
      secondsSinceLastConfirmedStation: 54,
      expectedSecondsToNextStation: 60,
      motionState: 'braking',
      hasSustainedArrivalWindow: true,
    });
    const decision = estimateTripProgress(tripInput);

    expect(calculateInertialOnlyConfidence(tripInput)).toBeCloseTo(0.7);
    expect(decision).toMatchObject({
      mode: 'inertial',
      shouldAdvanceVisualState: true,
      shouldConfirmStation: false,
      estimatedStationIndex: 1,
      reason: 'inertial-approaching-next-station',
    });
  });

  it('GPS ausente + tempo cumprido + stationary + janela sustentada = 0.9, confirma', () => {
    const tripInput = input({
      secondsSinceLastConfirmedStation: 54,
      expectedSecondsToNextStation: 60,
      motionState: 'stationary',
      hasSustainedArrivalWindow: true,
    });
    const decision = estimateTripProgress(tripInput);

    expect(calculateInertialOnlyConfidence(tripInput)).toBeCloseTo(0.9);
    expect(decision).toMatchObject({
      mode: 'inertial',
      shouldAdvanceVisualState: true,
      shouldConfirmStation: true,
      estimatedStationIndex: 2,
      reason: 'inertial-arrival-confirmed',
    });
  });

  it('GPS ausente + tempo cumprido + stationary sem janela sustentada = 0.8, não confirma', () => {
    const tripInput = input({
      secondsSinceLastConfirmedStation: 54,
      expectedSecondsToNextStation: 60,
      motionState: 'stationary',
      hasSustainedArrivalWindow: false,
    });
    const decision = estimateTripProgress(tripInput);

    expect(calculateInertialOnlyConfidence(tripInput)).toBeCloseTo(0.8);
    expect(decision.shouldAdvanceVisualState).toBe(true);
    expect(decision.shouldConfirmStation).toBe(false);
    expect(decision.estimatedStationIndex).toBe(1);
  });

  it('stationary isolado não confirma', () => {
    const decision = estimateTripProgress(input({
      motionState: 'stationary',
      hasSustainedArrivalWindow: false,
      secondsSinceLastConfirmedStation: 10,
    }));

    expect(decision.confidence).toBeCloseTo(0.3);
    expect(decision.shouldConfirmStation).toBe(false);
  });

  it('braking isolado não confirma', () => {
    const decision = estimateTripProgress(input({
      motionState: 'braking',
      hasSustainedArrivalWindow: false,
      secondsSinceLastConfirmedStation: 10,
    }));

    expect(decision.confidence).toBeCloseTo(0.1);
    expect(decision.shouldAdvanceVisualState).toBe(false);
    expect(decision.shouldConfirmStation).toBe(false);
  });

  it('speedMps null não confirma na primeira leitura', () => {
    expect(estimateTripProgress(input({
      gpsAvailable: true,
      gpsAccuracyMeters: 20,
      distanceToNextStationMeters: 40,
      speedMps: null,
      motionState: 'stationary',
      hasSustainedArrivalWindow: false,
      secondsSinceLastConfirmedStation: 54,
      expectedSecondsToNextStation: 60,
    })).shouldConfirmStation).toBe(false);
  });

  it('motor não pula mais de uma estação', () => {
    expect(estimateTripProgress(input({
      currentStationIndex: 2,
      destinationStationIndex: 4,
      routeStationCount: 5,
      secondsSinceLastConfirmedStation: 54,
      expectedSecondsToNextStation: 60,
      motionState: 'stationary',
      hasSustainedArrivalWindow: true,
    }))).toMatchObject({
      estimatedStationIndex: 3,
      nextStationIndex: 3,
      shouldConfirmStation: true,
    });
  });

  it('GPS confiável vence na reconciliação', () => {
    expect(estimateTripProgress(input({
      gpsAvailable: true,
      gpsAccuracyMeters: 15,
      distanceToNextStationMeters: 30,
      speedMps: 0.2,
      motionState: 'moving',
      hasSustainedArrivalWindow: false,
      secondsSinceLastConfirmedStation: 5,
    }))).toMatchObject({
      mode: 'normal',
      confidence: 1,
      shouldConfirmStation: true,
      estimatedStationIndex: 2,
    });
  });

  it('não retorna intenção de notificação por estação', () => {
    const decision = estimateTripProgress(input({
      secondsSinceLastConfirmedStation: 54,
      expectedSecondsToNextStation: 60,
      motionState: 'stationary',
      hasSustainedArrivalWindow: true,
    }));

    expect(decision).not.toHaveProperty('notification');
    expect(decision).not.toHaveProperty('shouldNotifyStation');
  });
});

describe('hasSustainedArrivalWindow', () => {
  it('exige 3 leituras stationary consecutivas', () => {
    const samples: MotionStateSample[] = [
      { timestamp: 1_000, motionState: 'moving' },
      { timestamp: 2_000, motionState: 'stationary' },
      { timestamp: 3_000, motionState: 'stationary' },
      { timestamp: 4_000, motionState: 'stationary' },
    ];

    expect(hasSustainedArrivalWindow(samples)).toBe(true);
  });

  it('aceita 2 leituras stationary quando sustentadas por 5s', () => {
    const samples: MotionStateSample[] = [
      { timestamp: 1_000, motionState: 'moving' },
      { timestamp: 2_000, motionState: 'stationary' },
      { timestamp: 7_000, motionState: 'stationary' },
    ];

    expect(hasSustainedArrivalWindow(samples)).toBe(true);
  });

  it('uma única leitura stationary nunca confirma janela sustentada', () => {
    expect(hasSustainedArrivalWindow([
      { timestamp: 1_000, motionState: 'stationary' },
    ])).toBe(false);
  });

  it('ignora stationary antigo se a sequência recente foi interrompida', () => {
    expect(hasSustainedArrivalWindow([
      { timestamp: 1_000, motionState: 'stationary' },
      { timestamp: 2_000, motionState: 'stationary' },
      { timestamp: 3_000, motionState: 'moving' },
      { timestamp: 4_000, motionState: 'stationary' },
    ])).toBe(false);
  });
});

describe('shouldReturnToBetweenStationsAfterDeparture', () => {
  it('at-station -> between-stations depois da partida', () => {
    expect(shouldReturnToBetweenStationsAfterDeparture({
      stationProgressState: 'at-station',
      motionState: 'accelerating',
      secondsSinceLastConfirmedStation: 11,
      distanceToCurrentStationMeters: 70,
    })).toBe(true);
  });

  it('mantém at-station durante janela de graça após confirmação', () => {
    expect(shouldReturnToBetweenStationsAfterDeparture({
      stationProgressState: 'at-station',
      motionState: 'moving',
      secondsSinceLastConfirmedStation: 10,
      distanceToCurrentStationMeters: 70,
    })).toBe(false);
  });
});
