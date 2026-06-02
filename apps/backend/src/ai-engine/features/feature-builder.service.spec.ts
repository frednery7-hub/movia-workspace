import { FeatureBuilderService } from './feature-builder.service';
import type { DatasetEntry } from '../dataset/dataset-builder.service';

function makeEntry(
  delaySeconds: number,
  currentStatus: string,
  hourOfDay = 9,
  dayOfWeek = 2,
): DatasetEntry {
  return { delaySeconds, currentStatus, hourOfDay, dayOfWeek } as DatasetEntry;
}

describe('FeatureBuilderService', () => {
  let builder: FeatureBuilderService;

  beforeEach(() => {
    builder = new FeatureBuilderService();
  });

  it('FEATURE.1 — retorna null para dataset vazio', () => {
    expect(builder.extract('L1', [])).toBeNull();
  });

  it('FEATURE.2 — calcula avgDelaySeconds corretamente', () => {
    const entries = [
      makeEntry(60, 'NORMAL'),
      makeEntry(120, 'DELAYED'),
      makeEntry(180, 'DELAYED'),
    ];
    const result = builder.extract('L1', entries)!;
    expect(result.avgDelaySeconds).toBe(120); // (60+120+180)/3 = 120
  });

  it('FEATURE.3 — calcula maxDelaySeconds corretamente', () => {
    const entries = [
      makeEntry(30, 'NORMAL'),
      makeEntry(500, 'FAULTY'),
      makeEntry(100, 'DELAYED'),
    ];
    const result = builder.extract('L1', entries)!;
    expect(result.maxDelaySeconds).toBe(500);
  });

  it('FEATURE.4 — conta incidentCount apenas para DELAYED, FAULTY e SUSPENDED', () => {
    const entries = [
      makeEntry(0, 'NORMAL'),
      makeEntry(150, 'DELAYED'),
      makeEntry(700, 'FAULTY'),
      makeEntry(0, 'SUSPENDED'),
      makeEntry(0, 'NORMAL'),
    ];
    const result = builder.extract('L1', entries)!;
    expect(result.incidentCount).toBe(3); // DELAYED + FAULTY + SUSPENDED
  });

  it('FEATURE.5 — entradas NORMAL não contam como incidentes', () => {
    const entries = [
      makeEntry(0, 'NORMAL'),
      makeEntry(0, 'NORMAL'),
      makeEntry(0, 'NORMAL'),
    ];
    const result = builder.extract('L1', entries)!;
    expect(result.incidentCount).toBe(0);
  });

  it('FEATURE.6 — degradationRatio = incidentCount / total com 2 casas decimais', () => {
    const entries = [
      makeEntry(0, 'NORMAL'),
      makeEntry(150, 'DELAYED'),
      makeEntry(700, 'FAULTY'),
      makeEntry(0, 'NORMAL'),
    ];
    const result = builder.extract('L1', entries)!;
    expect(result.degradationRatio).toBe(0.5); // 2/4
  });

  it('FEATURE.7 — usa última entrada para currentDelaySeconds, hourOfDay, dayOfWeek', () => {
    const entries = [
      makeEntry(100, 'DELAYED', 8, 1),
      makeEntry(200, 'DELAYED', 9, 2),
      makeEntry(300, 'FAULTY', 18, 3), // ← esta é a última
    ];
    const result = builder.extract('L1', entries)!;
    expect(result.currentDelaySeconds).toBe(300);
    expect(result.hourOfDay).toBe(18);
    expect(result.dayOfWeek).toBe(3);
  });

  it('FEATURE.8 — dataset de um único elemento válido extrai features corretamente', () => {
    const entries = [makeEntry(90, 'DELAYED', 7, 4)];
    const result = builder.extract('L2', entries)!;
    expect(result).not.toBeNull();
    expect(result.avgDelaySeconds).toBe(90);
    expect(result.maxDelaySeconds).toBe(90);
    expect(result.currentDelaySeconds).toBe(90);
    expect(result.incidentCount).toBe(1);
    expect(result.degradationRatio).toBe(1.0);
  });
});
