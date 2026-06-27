import { LineStatus } from '@prisma/client';

export interface RouteStation {
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

export interface EtaPrediction {
  available: boolean;
  model: string;
  confidence: number;
  predictedStatus: LineStatus;
  linesAnalyzed: string[];
}

export type EtaRouteStatus = 'NORMAL' | 'DELAYED' | 'DEGRADED' | 'NO_ROUTE';

export interface EtaBreakdownDto {
  rideMinutes: number;
  dwellMinutes: number;
  transferWalkMinutes: number;
  transferWaitMinutes: number;
  totalMinutes: number;
  minTotalMinutes?: number;
  maxTotalMinutes?: number;
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
  path: RouteStation[];
  linesOnRoute: string[];
  timing: EtaTiming;
  etaBreakdown: EtaBreakdownDto;
  arrivalTime: string;
}

export interface EnrichedEtaResponse {
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
  path: RouteStation[];
  stationsCount: number;
  linesOnRoute: string[];
  timing: EtaTiming;
  etaBreakdown: EtaBreakdownDto;
  arrivalTime: string;
  arrivalTimeOptimistic: string;
  prediction: EtaPrediction | null;
  status: EtaRouteStatus;
  routeDegraded: boolean;
  routes: EtaRouteOption[];
}
