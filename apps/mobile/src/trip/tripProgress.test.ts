import { buildActiveTripProgress, getTripTimelineNotice } from './tripProgress';

describe('buildActiveTripProgress', () => {
  const base = {
    routeId: 'route-1',
    stationIds: ['a', 'b', 'c', 'd'],
    totalEstimatedSeconds: 600,
    navigationMode: 'approximate' as const,
  };

  it('avanca por tempo estimado sem GPS confirmado', () => {
    const progress = buildActiveTripProgress({
      ...base,
      tripStatus: 'active',
      currentStationIndex: null,
      elapsedSeconds: 300,
      navigationMode: 'offline',
    });
    expect(progress.progressPercent).toBe(50);
    expect(progress.mode).toBe('estimated');
    expect(progress.completedStationIds).toEqual(['a', 'b']);
    expect(progress.currentStationId).toBeUndefined();
    expect(progress.nextStationId).toBe('c');
  });

  it('nunca fica atras do progresso GPS confirmado', () => {
    const progress = buildActiveTripProgress({
      ...base,
      tripStatus: 'active',
      currentStationIndex: 2,
      elapsedSeconds: 30,
    });
    expect(progress.progressPercent).toBeGreaterThanOrEqual(67);
    expect(progress.remainingStations).toBe(1);
  });

  it('marca cem por cento na chegada', () => {
    const progress = buildActiveTripProgress({
      ...base,
      tripStatus: 'arrived',
      currentStationIndex: 3,
      elapsedSeconds: 500,
    });
    expect(progress.progressPercent).toBe(100);
    expect(progress.remainingStations).toBe(0);
  });
});

describe('getTripTimelineNotice', () => {
  it('prioriza chegada sobre todos os demais avisos', () => {
    expect(getTripTimelineNotice({
      tripStatus: 'arrived',
      remainingStations: 0,
      nextStationName: 'Destino',
      nextTransferStationName: 'Tobalaba',
    })).toEqual({ type: 'arrived' });
  });

  it('prioriza a estação anterior ao destino', () => {
    expect(getTripTimelineNotice({
      tripStatus: 'active',
      remainingStations: 2,
      nextStationName: 'Penúltima',
      nextTransferStationName: 'Tobalaba',
    })).toEqual({ type: 'before-destination' });
  });

  it('mostra a baldeação antes do aviso genérico da próxima estação', () => {
    expect(getTripTimelineNotice({
      tripStatus: 'active',
      remainingStations: 4,
      nextStationName: 'Tobalaba',
      nextTransferStationName: 'Tobalaba',
    })).toEqual({ type: 'transfer', stationName: 'Tobalaba' });
  });

  it('combina próxima estação e quantidade restante em um único aviso', () => {
    expect(getTripTimelineNotice({
      tripStatus: 'active',
      remainingStations: 3,
      nextStationName: 'Los Leones',
    })).toEqual({
      type: 'next',
      stationName: 'Los Leones',
      remainingStations: 3,
    });
  });

  it('não mostra aviso operacional durante preview', () => {
    expect(getTripTimelineNotice({
      tripStatus: 'preview',
      remainingStations: 4,
      nextStationName: 'Tobalaba',
    })).toBeNull();
  });
});
