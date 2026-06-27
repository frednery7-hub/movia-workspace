import { CacheService } from '../config/cache.service';
import type { ActiveTripPhase } from './activeTripState';
import type { ActiveTripProgress } from './tripProgress';

export const ACTIVE_TRIP_CACHE_KEY = 'active_trip_cache';
export const ACTIVE_TRIP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type ActiveTripRouteSnapshot = {
  destination?: string;
  path?: unknown[];
  routes?: unknown[];
  timing?: unknown;
  etaBreakdown?: unknown;
};

export type ActiveTripCache = {
  routeId: string;
  startedAt: string;
  lastUpdatedAt: string;
  routeSnapshot: ActiveTripRouteSnapshot;
  progressState: ActiveTripProgress;
  phase: ActiveTripPhase;
  firedNoticeIds: string[];
};

export function createActiveTripCache(params: {
  routeId: string;
  routeSnapshot: ActiveTripRouteSnapshot;
  progressState: ActiveTripProgress;
  phase: ActiveTripPhase;
  now?: Date;
}): ActiveTripCache {
  const timestamp = (params.now ?? new Date()).toISOString();
  return {
    routeId: params.routeId,
    startedAt: timestamp,
    lastUpdatedAt: timestamp,
    routeSnapshot: params.routeSnapshot,
    progressState: params.progressState,
    phase: params.phase,
    firedNoticeIds: [],
  };
}

export function updateActiveTripCache(
  cache: ActiveTripCache,
  updates: Partial<Pick<ActiveTripCache, 'progressState' | 'phase' | 'routeSnapshot'>>,
  now = new Date(),
): ActiveTripCache {
  return {
    ...cache,
    ...updates,
    lastUpdatedAt: now.toISOString(),
  };
}

export function markActiveTripNoticeFired(
  cache: ActiveTripCache,
  noticeId: string,
  now = new Date(),
): ActiveTripCache {
  if (cache.firedNoticeIds.includes(noticeId)) {
    return updateActiveTripCache(cache, {}, now);
  }

  return updateActiveTripCache(
    {
      ...cache,
      firedNoticeIds: [...cache.firedNoticeIds, noticeId],
    },
    {},
    now,
  );
}

export function hasActiveTripNoticeFired(
  cache: ActiveTripCache | null,
  noticeId: string,
): boolean {
  return cache?.firedNoticeIds.includes(noticeId) ?? false;
}

export function recalculateProgressClockFromCache(params: {
  routeStartedAtMs: number;
  cachedAt: string;
  now?: Date;
}): number {
  const cachedAtMs = new Date(params.cachedAt).getTime();
  if (!Number.isFinite(cachedAtMs)) return params.routeStartedAtMs;

  const nowMs = (params.now ?? new Date()).getTime();
  const elapsedSinceCacheMs = Math.max(0, nowMs - cachedAtMs);
  return params.routeStartedAtMs - elapsedSinceCacheMs;
}

export async function saveActiveTripCache(cache: ActiveTripCache): Promise<void> {
  await CacheService.set(ACTIVE_TRIP_CACHE_KEY, cache, ACTIVE_TRIP_CACHE_TTL_MS);
}

export async function getActiveTripCache(): Promise<ActiveTripCache | null> {
  return CacheService.get<ActiveTripCache>(ACTIVE_TRIP_CACHE_KEY);
}

export async function clearActiveTripCache(): Promise<void> {
  await CacheService.invalidate(ACTIVE_TRIP_CACHE_KEY);
}
