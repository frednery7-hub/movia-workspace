import {
  createActiveTripCache,
  hasActiveTripNoticeFired,
  markActiveTripNoticeFired,
  recalculateProgressClockFromCache,
  updateActiveTripCache,
} from './activeTripCache';
import type { ActiveTripProgress } from './tripProgress';

const progress: ActiveTripProgress = {
  routeId: 'route-1',
  currentLegIndex: 0,
  currentSegmentIndex: 0,
  completedStationIds: [],
  totalStations: 3,
  totalSegments: 2,
  progressPercent: 0,
  segmentProgressPercent: 0,
  remainingStations: 3,
  mode: 'hybrid',
};

describe('activeTripCache', () => {
  it('cria cache com snapshot, progresso e fase', () => {
    const cache = createActiveTripCache({
      routeId: 'route-1',
      routeSnapshot: { destination: 'st_destino', path: [] },
      progressState: progress,
      phase: 'onTrain',
      now: new Date('2026-06-23T12:00:00.000Z'),
    });

    expect(cache).toMatchObject({
      routeId: 'route-1',
      startedAt: '2026-06-23T12:00:00.000Z',
      lastUpdatedAt: '2026-06-23T12:00:00.000Z',
      phase: 'onTrain',
      firedNoticeIds: [],
    });
  });

  it('atualiza progresso e fase preservando startedAt', () => {
    const cache = createActiveTripCache({
      routeId: 'route-1',
      routeSnapshot: {},
      progressState: progress,
      phase: 'onTrain',
      now: new Date('2026-06-23T12:00:00.000Z'),
    });

    const updated = updateActiveTripCache(
      cache,
      { phase: 'approachingTransfer' },
      new Date('2026-06-23T12:01:00.000Z'),
    );

    expect(updated.startedAt).toBe(cache.startedAt);
    expect(updated.lastUpdatedAt).toBe('2026-06-23T12:01:00.000Z');
    expect(updated.phase).toBe('approachingTransfer');
  });

  it('marca notice uma única vez', () => {
    const cache = createActiveTripCache({
      routeId: 'route-1',
      routeSnapshot: {},
      progressState: progress,
      phase: 'onTrain',
    });

    const first = markActiveTripNoticeFired(cache, 'transfer-before:route-1:st_a');
    const second = markActiveTripNoticeFired(first, 'transfer-before:route-1:st_a');

    expect(second.firedNoticeIds).toEqual(['transfer-before:route-1:st_a']);
    expect(hasActiveTripNoticeFired(second, 'transfer-before:route-1:st_a')).toBe(true);
  });

  it('recalibra o relógio do progresso ao voltar do background', () => {
    expect(recalculateProgressClockFromCache({
      routeStartedAtMs: 1_000_000,
      cachedAt: '2026-06-23T12:00:00.000Z',
      now: new Date('2026-06-23T12:00:30.000Z'),
    })).toBe(970_000);
  });
});
