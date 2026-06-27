import { buildActiveTripState } from './activeTripState';
import { buildActiveTripProgress, getActiveTimelineNotice, getTripTimelineNotice } from './tripProgress';

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

  it('rota com 1 trecho só chega a 100% na chegada final', () => {
    const progress = buildActiveTripProgress({
      routeId: 'route-short',
      stationIds: ['origin', 'destination'],
      totalEstimatedSeconds: 120,
      navigationMode: 'normal',
      tripStatus: 'active',
      currentStationIndex: 0,
      elapsedSeconds: 30,
    });

    expect(progress.totalSegments).toBe(1);
    expect(progress.progressPercent).toBeLessThan(100);
  });

  it('rota com múltiplas estações mantém progresso acumulado entre estações', () => {
    const first = buildActiveTripProgress({
      ...base,
      tripStatus: 'active',
      currentStationIndex: 1,
      elapsedSeconds: 180,
    });
    const second = buildActiveTripProgress({
      ...base,
      tripStatus: 'active',
      currentStationIndex: 2,
      elapsedSeconds: 240,
    });

    expect(second.progressPercent).toBeGreaterThan(first.progressPercent);
    expect(second.progressPercent).toBeGreaterThanOrEqual(67);
  });

  it('rota com baldeação conta a estação duplicada dentro do progresso total', () => {
    const progress = buildActiveTripProgress({
      routeId: 'route-transfer',
      stationIds: ['los_leones:l1', 'tobalaba:l1', 'tobalaba:l4', 'cristobal:l4'],
      totalEstimatedSeconds: 480,
      navigationMode: 'normal',
      tripStatus: 'active',
      currentStationIndex: 2,
      elapsedSeconds: 260,
    });

    expect(progress.totalSegments).toBe(3);
    expect(progress.progressPercent).toBeGreaterThanOrEqual(67);
    expect(progress.progressPercent).toBeLessThan(100);
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

describe('getActiveTimelineNotice', () => {
  const route = [
    { id: 'origin', name: 'Origen', lineId: 'L1' as const, latitude: -33.1, longitude: -70.1 },
    { id: 'transfer-l1', name: 'Tobalaba', lineId: 'L1' as const, latitude: -33.2, longitude: -70.2 },
    { id: 'transfer-l4', name: 'Tobalaba', lineId: 'L4' as const, latitude: -33.2, longitude: -70.2 },
    { id: 'before-destination', name: 'Las Mercedes', lineId: 'L4' as const, latitude: -33.3, longitude: -70.3 },
    { id: 'destination', name: 'Destino', lineId: 'L4' as const, latitude: -33.4, longitude: -70.4 },
  ];

  function stateAt(index: number | null, tripStatus: 'preview' | 'active' | 'arrived' = 'active') {
    return buildActiveTripState({
      routeId: 'route-notice',
      orderedRoutePath: route,
      currentStationIndex: index,
      navigationMode: 'normal',
      tripStatus,
    });
  }

  it('prioriza chegada ao destino', () => {
    expect(getActiveTimelineNotice(stateAt(4))?.type).toBe('arrived');
  });

  it('prioriza estação anterior ao destino antes de próxima estação', () => {
    const notice = getActiveTimelineNotice(stateAt(3));

    expect(notice?.type).toBe('beforeDestination');
    expect(notice?.priority).toBe(90);
  });

  it('mostra aviso antes de baldeação quando a próxima estação é transferência', () => {
    expect(getActiveTimelineNotice(stateAt(0))?.type).toBe('beforeTransfer');
  });

  it('mostra baldeação atual quando o índice está na transferência', () => {
    expect(getActiveTimelineNotice(stateAt(1))?.type).toBe('transfer');
  });

  it('não mostra aviso durante preview', () => {
    expect(getActiveTimelineNotice(stateAt(null, 'preview'))).toBeNull();
  });
});
