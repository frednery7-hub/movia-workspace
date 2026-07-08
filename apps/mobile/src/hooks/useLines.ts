import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';
import { CacheService } from '../config/cache.service';
import {
  getAllLines as getLinesFromDb,
  saveLines as saveLinesToDb,
} from '../database/stationsRepository';

const CACHE_KEY = 'lines_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — linhas mudam raramente

export interface LineResponse {
  id: string;
  name: string;
  color: string;
  status?: 'NORMAL' | 'DELAYED' | 'FAULTY' | 'SUSPENDED';
}

/**
 * Busca as linhas do metrô, com fallback em cascata:
 * rede → SQLite → AsyncStorage.
 *
 * Nota: o campo `status` (NORMAL/DELAYED/etc) vem da rede e reflete o
 * estado *naquele momento*. Ao servir do cache offline, o status pode
 * estar desatualizado — o app não deve prometer estado em tempo real
 * quando está sem conexão.
 */
async function fetchLines(): Promise<LineResponse[]> {
  try {
    const { data } = await api.get<LineResponse[]>('/lines');

    await CacheService.set(CACHE_KEY, data, CACHE_TTL);
    saveLinesToDb(data).catch(() => undefined);

    return data;
  } catch (err) {
    try {
      const local = await getLinesFromDb();
      if (local.length > 0) return local;
    } catch {
      // Banco local indisponível — tenta o AsyncStorage abaixo.
    }

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
