import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';
import { CacheService } from '../config/cache.service';

const CACHE_KEY = 'lines_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — linhas mudam raramente

export interface LineResponse {
  id: string;
  name: string;
  color: string;
  status?: 'NORMAL' | 'DELAYED' | 'FAULTY' | 'SUSPENDED';
}

async function fetchLines(): Promise<LineResponse[]> {
  try {
    const { data } = await api.get<LineResponse[]>('/lines');
    await CacheService.set(CACHE_KEY, data, CACHE_TTL);
    return data;
  } catch (err) {
    const cached = await CacheService.get<LineResponse[]>(CACHE_KEY);
    if (cached) return cached;
    throw err;
  }
}

export function useLines() {
  return useQuery({
    queryKey: ['lines'],
    queryFn: fetchLines,
    staleTime: 5 * 60 * 1000, // 5min — TanStack nao refetch antes disso
    gcTime: 10 * 60 * 1000,
  });
}
