import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';

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

async function fetchEta(
  destinationId: string,
  originId: string,
): Promise<EtaResponse> {
  const { data } = await api.get<EtaResponse>(
    `/eta/${destinationId}?from=${originId}`,
  );
  return data;
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
