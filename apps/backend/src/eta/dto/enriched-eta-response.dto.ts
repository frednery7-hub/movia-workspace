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

export interface EtaRouteOption {
  id: string;
  type: 'recommended' | 'alternative';
  label: string;
  reason?: string;
  differenceLabel?: string;
  durationMinutes: number;
  walkMeters: number;
  transfers: number;
  path: RouteStation[];
  linesOnRoute: string[];
  timing: EtaTiming;
  arrivalTime: string;
}

export interface EnrichedEtaResponse {
  destination: string;
  path: RouteStation[];
  stationsCount: number;
  linesOnRoute: string[];
  timing: EtaTiming;
  arrivalTime: string;
  arrivalTimeOptimistic: string;
  prediction: EtaPrediction | null;
  status: EtaRouteStatus;
  routeDegraded: boolean;
  routes: EtaRouteOption[];
}
