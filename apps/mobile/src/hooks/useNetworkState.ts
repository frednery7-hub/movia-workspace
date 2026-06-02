import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';
import { CacheService } from '../config/cache.service';

const CACHE_KEY = 'network_state_v1';
const CACHE_TTL = 30 * 1000; // 30s — status velho e enganoso

export interface NetworkStateItem {
  lineId: string;
  status: 'NORMAL' | 'DELAYED' | 'FAULTY' | 'SUSPENDED';
  delaySeconds?: number;
  message?: string;
  updatedAt: string;
}

async function fetchNetworkState(): Promise<NetworkStateItem[]> {
  try {
    const { data } = await api.get<NetworkStateItem[]>('/network-state');
    await CacheService.set(CACHE_KEY, data, CACHE_TTL);
    return data;
  } catch (err) {
    const cached = await CacheService.get<NetworkStateItem[]>(CACHE_KEY);
    if (cached) return cached;
    throw err;
  }
}

export function useNetworkState() {
  const query = useQuery({
    queryKey: ['networkState'],
    queryFn: fetchNetworkState,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000, // refetch a cada 60s automaticamente
  });

  const isStale =
    query.dataUpdatedAt > 0 &&
    Date.now() - query.dataUpdatedAt > 90 * 1000;

  return { ...query, isStale };
}
