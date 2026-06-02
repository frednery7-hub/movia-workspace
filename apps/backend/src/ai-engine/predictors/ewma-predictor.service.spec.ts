import { EwmaPredictorService } from './ewma-predictor.service';
import { LineStatus } from '@prisma/client';
import type { FeatureVector } from '../features/feature-builder.service';

function makeFeatures(
  lineId: string,
  currentDelaySeconds: number,
  avgDelaySeconds: number,
  overrides: Partial<FeatureVector> = {},
): FeatureVector {
  return {
    lineId,
    currentDelaySeconds,
    avgDelaySeconds,
    maxDelaySeconds: Math.max(currentDelaySeconds, avgDelaySeconds),
    incidentCount: 0,
    degradationRatio: 0,
    hourOfDay: 9,
    dayOfWeek: 2,
    ...overrides,
  };
}

describe('EwmaPredictorService', () => {
  let predictor: EwmaPredictorService;

  beforeEach(() => {
    predictor = new EwmaPredictorService();
  });

  // ── Inicialização ──────────────────────────────────────────────────────────

  it('EWMA.1 — primeira predição usa avgDelaySeconds como estado inicial', () => {
    const result = predictor.predict(makeFeatures('L1', 200, 150));
    // Sem estado anterior: EWMA = avgDelaySeconds = 150
    expect(result.predictedDelaySeconds).toBe(150);
  });

  // ── Fórmula α ──────────────────────────────────────────────────────────────

  it('EWMA.2 — segunda predição aplica S_t = 0.3*Y_t + 0.7*S_{t-1}', () => {
    predictor.predict(makeFeatures('L1', 100, 100)); // estado inicial = 100
    const result = predictor.predict(makeFeatures('L1', 200, 150));
    // S = 0.3 * 200 + 0.7 * 100 = 60 + 70 = 130
    expect(result.predictedDelaySeconds).toBe(130);
  });

  it('EWMA.3 — EWMA decai corretamente em direção ao normal após melhora', () => {
    // Estabelece estado elevado
    predictor.predict(makeFeatures('L1', 300, 300)); // estado = 300
    predictor.predict(makeFeatures('L1', 300, 300)); // estado = 300
    // Agora melhora
    const result = predictor.predict(makeFeatures('L1', 0, 0));
    // S = 0.3 * 0 + 0.7 * 300 = 210 — ainda alto, mas decaindo
    expect(result.predictedDelaySeconds).toBe(210);
    // Confirma que está abaixo do estado anterior
    expect(result.predictedDelaySeconds).toBeLessThan(300);
  });

  // ── Resistência a ruído ────────────────────────────────────────────────────

  it('EWMA.4 — spike isolado não dispara DELAYED (α=0.3 amortece ruído)', () => {
    predictor.predict(makeFeatures('L2', 0, 0)); // baseline = 0
    // Spike de 300s — muito acima do threshold de 120s
    const result = predictor.predict(makeFeatures('L2', 300, 0));
    // S = 0.3 * 300 + 0.7 * 0 = 90 — ainda NORMAL
    expect(result.predictedDelaySeconds).toBe(90);
    expect(result.predictedStatus).toBe(LineStatus.NORMAL);
  });

  it('EWMA.5 — atraso sustentado de 300s é reconhecido como DELAYED', () => {
    // Primeira call usa avgDelaySeconds = 300 como estado inicial
    const result = predictor.predict(makeFeatures('L3', 300, 300));
    expect(result.predictedDelaySeconds).toBe(300);
    expect(result.predictedStatus).toBe(LineStatus.DELAYED);
  });

  // ── Classificação de status ────────────────────────────────────────────────

  it('EWMA.6 — delay < 120s classifica como NORMAL', () => {
    const result = predictor.predict(makeFeatures('L4', 100, 100));
    expect(result.predictedStatus).toBe(LineStatus.NORMAL);
  });

  it('EWMA.7 — delay >= 120s classifica como DELAYED', () => {
    const result = predictor.predict(makeFeatures('L4', 120, 120));
    expect(result.predictedStatus).toBe(LineStatus.DELAYED);
  });

  it('EWMA.8 — delay >= 600s classifica como FAULTY', () => {
    const result = predictor.predict(makeFeatures('L4', 600, 600));
    expect(result.predictedStatus).toBe(LineStatus.FAULTY);
  });

  // ── Confidence ────────────────────────────────────────────────────────────

  it('EWMA.9 — confidence = 0.3 quando incidentCount = 0', () => {
    const result = predictor.predict(
      makeFeatures('L5', 0, 0, { incidentCount: 0 }),
    );
    expect(result.confidence).toBe(0.3);
  });

  it('EWMA.10 — confidence = 0.5 quando incidentCount < 5', () => {
    const result = predictor.predict(
      makeFeatures('L5', 0, 0, { incidentCount: 3 }),
    );
    expect(result.confidence).toBe(0.5);
  });

  it('EWMA.11 — confidence = 0.9 quando degradationRatio > 0.8', () => {
    const result = predictor.predict(
      makeFeatures('L5', 200, 200, {
        incidentCount: 10,
        degradationRatio: 0.9,
      }),
    );
    expect(result.confidence).toBe(0.9);
  });

  it('EWMA.12 — confidence cresce com incidentCount (max 0.95)', () => {
    const result = predictor.predict(
      makeFeatures('L5', 200, 200, {
        incidentCount: 50,
        degradationRatio: 0.5,
      }),
    );
    expect(result.confidence).toBe(0.95);
  });

  // ── Estado ─────────────────────────────────────────────────────────────────

  it('EWMA.13 — resetState(lineId) limpa apenas a linha especificada', () => {
    predictor.predict(makeFeatures('L1', 300, 300));
    predictor.predict(makeFeatures('L2', 300, 300));
    predictor.resetState('L1');

    // L1 resetada: próxima call usa avgDelaySeconds novamente
    const l1Result = predictor.predict(makeFeatures('L1', 200, 100));
    expect(l1Result.predictedDelaySeconds).toBe(100); // usa avg como inicial

    // L2 mantém estado
    const l2Result = predictor.predict(makeFeatures('L2', 0, 0));
    // S = 0.3 * 0 + 0.7 * 300 = 210 — estado anterior preservado
    expect(l2Result.predictedDelaySeconds).toBe(210);
  });

  it('EWMA.14 — resetState() sem argumento limpa estado de todas as linhas', () => {
    predictor.predict(makeFeatures('L1', 300, 300));
    predictor.predict(makeFeatures('L2', 300, 300));
    predictor.resetState();

    const l1 = predictor.predict(makeFeatures('L1', 200, 50));
    const l2 = predictor.predict(makeFeatures('L2', 200, 50));
    // Ambas usam avgDelaySeconds = 50 como primeiro estado
    expect(l1.predictedDelaySeconds).toBe(50);
    expect(l2.predictedDelaySeconds).toBe(50);
  });
});
