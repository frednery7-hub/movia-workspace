import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';
import { CacheService } from '../config/cache.service';
import { isOnline } from '../network/connectivity';

export interface EtaPath {
  id: string;
  name: string;
  lineId: string;
}

export interface EtaTiming {
  baseDurationSeconds: number;
  currentDelaySeconds: number;
  predictedDelaySeconds: number;
  appliedDelaySeconds: number;
  totalEstimatedSeconds: number;
}

export interface EtaBreakdown {
  rideMinutes: number;
  dwellMinutes: number;
  transferWalkMinutes: number;
  transferWaitMinutes: number;
  totalMinutes: number;
  minTotalMinutes?: number;
  maxTotalMinutes?: number;
}

export interface EtaPrediction {
  available: boolean;
  model: string;
  confidence: number;
  predictedStatus: string;
  linesAnalyzed: string[];
}

export interface EtaResponse {
  destination: string;
  requestedDestination?: {
    type: string;
    label: string;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
  };
  routeDestinationStation?: {
    id: string;
    name: string;
    lineIds: string[];
    distanceMeters?: number;
  };
  path: EtaPath[];
  stationsCount: number;
  linesOnRoute: string[];
  timing: EtaTiming;
  etaBreakdown: EtaBreakdown;
  arrivalTime: string;
  arrivalTimeOptimistic: string;
  prediction: EtaPrediction;
  status: 'NORMAL' | 'DELAYED' | 'DEGRADED' | 'NO_ROUTE';
  routeDegraded: boolean;
  routes?: EtaRouteOption[];
}

export type AlternativeRouteReason =
  | 'lessWalking'
  | 'fewerTransfers'
  | 'differentLines'
  | 'simplerRoute';

export interface AlternativeRouteSummary {
  reason: AlternativeRouteReason;
  differenceMinutes: number;
  label: string;
}

export interface EtaRouteOption {
  id: string;
  type: 'recommended' | 'alternative';
  label: string;
  reason?: string;
  reasonCode?: AlternativeRouteReason;
  summary?: AlternativeRouteSummary;
  differenceLabel?: string;
  durationMinutes: number;
  walkMeters: number;
  transfers: number;
  path: EtaPath[];
  linesOnRoute: string[];
  timing: EtaTiming;
  etaBreakdown: EtaBreakdown;
  arrivalTime: string;
}

/** Marca uma resposta de rota como servida do cache offline. */
export interface EtaResponseWithMeta extends EtaResponse {
  servedFromCache?: boolean;
}

const ETA_CACHE_TTL = 60 * 60 * 1000; // 1h — rota muda pouco no curto prazo

function etaCacheKey(originId: string, destinationId: string): string {
  return `eta_${originId}_${destinationId}`;
}

/**
 * Busca a rota/ETA com fallback offline.
 *
 * Fluxo: tenta a rede (fonte de verdade, sempre fresca) e guarda o
 * resultado. Se a rede falha, serve a última rota calculada para o
 * mesmo par origem-destino, marcada como servedFromCache para a UI
 * avisar que pode estar desatualizada.
 *
 * Isso cobre o caso real do metrô: o usuário calcula a rota na
 * plataforma (com sinal), entra no trem e perde a conexão -- a rota
 * continua visível em vez de sumir.
 *
 * Não recalcula rota offline: isso exigiria o motor de grafo no
 * cliente, o que está fora do escopo desta camada.
 */
export async function fetchEta(
  destinationId: string,
  originId: string,
): Promise<EtaResponseWithMeta> {
  const cacheKey = etaCacheKey(originId, destinationId);
  try {
    const { data } = await api.get<EtaResponse>(
      `/eta/${destinationId}?from=${originId}`,
    );
    await CacheService.set(cacheKey, data, ETA_CACHE_TTL);
    return data;
  } catch (error) {
    const cached = await CacheService.get<EtaResponse>(cacheKey);
    if (cached) {
      return { ...cached, servedFromCache: true };
    }
    // Sem cache: propaga um erro com contexto para a UI diferenciar
    // "sem conexão" de "sem rota".
    const online = await isOnline().catch(() => true);
    if (!online) {
      throw new Error('OFFLINE_NO_CACHED_ROUTE');
    }
    throw error;
  }
}

export function useEta(originId?: string, destinationId?: string) {
  return useQuery({
    queryKey: ['eta', originId, destinationId],
    queryFn: () => fetchEta(destinationId!, originId!),
    enabled: !!originId && !!destinationId,
    staleTime: 0,      // sempre fresco — rota e unica por combinacao
    gcTime: 0,         // nao guarda em cache
    retry: 1,
  });
}
