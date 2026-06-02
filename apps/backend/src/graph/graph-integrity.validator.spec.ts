import { validateGraphData } from './graph-integrity.validator';

const validStation = {
  id: 'st_tobalaba',
  latitude: -33.4185,
  longitude: -70.6059,
};
const validPlatL4 = {
  id: 'plt_tobalaba_l4',
  stationId: 'st_tobalaba',
  lineId: 'L4',
};
const validPlatL1 = {
  id: 'plt_tobalaba_l1',
  stationId: 'st_tobalaba',
  lineId: 'L1',
};
const validSegment = {
  id: 'seg_01',
  fromPlatformId: 'plt_tobalaba_l4',
  toPlatformId: 'plt_tobalaba_l1',
  lineId: 'L4',
  averageDurationSeconds: 90,
  distanceMeters: 1200,
  sequence: 0,
};
const validTransfer = {
  id: 'itf_01',
  fromPlatformId: 'plt_tobalaba_l4',
  toPlatformId: 'plt_tobalaba_l1',
  walkingSeconds: 120,
};

function base() {
  return {
    stations: [{ ...validStation }],
    platforms: [{ ...validPlatL4 }, { ...validPlatL1 }],
    segments: [{ ...validSegment }],
    transfers: [{ ...validTransfer }],
  };
}

describe('GraphIntegrityValidator', () => {
  let data: ReturnType<typeof base>;
  beforeEach(() => {
    data = base();
  });

  it('INTEGRITY.1 — dataset válido passa sem erro', () => {
    expect(() => validateGraphData(data)).not.toThrow();
  });

  it('INTEGRITY.2 — latitude inválida (> 90)', () => {
    data.stations[0].latitude = 91;
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.3 — longitude inválida (< -180)', () => {
    data.stations[0].longitude = -181;
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.4 — platform com stationId órfão', () => {
    data.platforms[0].stationId = 'st_fantasma';
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.5 — segment com averageDurationSeconds = 0', () => {
    data.segments[0].averageDurationSeconds = 0;
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.6 — segment com averageDurationSeconds negativo', () => {
    data.segments[0].averageDurationSeconds = -1;
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.7 — segment com distanceMeters negativo', () => {
    data.segments[0].distanceMeters = -100;
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.8 — segment com sequence negativo', () => {
    data.segments[0].sequence = -1;
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.9 — segment com fromPlatformId órfão', () => {
    data.segments[0].fromPlatformId = 'plt_fantasma';
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.10 — segment com toPlatformId órfão', () => {
    data.segments[0].toPlatformId = 'plt_fantasma';
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.11 — segment com self-loop (from === to)', () => {
    data.segments[0].toPlatformId = data.segments[0].fromPlatformId;
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.12 — transfer com walkingSeconds negativo', () => {
    data.transfers[0].walkingSeconds = -1;
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.13 — transfer com fromPlatformId órfão', () => {
    data.transfers[0].fromPlatformId = 'plt_fantasma';
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.14 — transfer com toPlatformId órfão', () => {
    data.transfers[0].toPlatformId = 'plt_fantasma';
    expect(() => validateGraphData(data)).toThrow(/GraphIntegrityValidator/);
  });

  it('INTEGRITY.15 — acumula múltiplas violações antes de lançar', () => {
    data.stations[0].latitude = 999;
    data.platforms[0].stationId = 'st_fantasma';
    data.segments[0].sequence = -5;
    expect(() => validateGraphData(data)).toThrow(/3 violacao/);
  });
});
