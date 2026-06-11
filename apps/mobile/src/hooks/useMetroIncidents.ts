import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';

export type MetroIncidentStatus =
  | 'normal'
  | 'delay'
  | 'partial'
  | 'interrupted'
  | 'unknown';

export interface MetroIncident {
  id: string;
  lineId: 'L1' | 'L2' | 'L3' | 'L4' | 'L4A' | 'L5' | 'L6';
  status: MetroIncidentStatus;
  title: string;
  description?: string;
  source: 'official-metro';
  scrapedAt: string;
  updatedAt: string;
}

export interface MetroIncidentsResponse {
  updatedAt: string;
  source: 'official-metro';
  sourceUrl: 'https://www.metro.cl/el-viaje/estado-red';
  stale?: boolean;
  incidents: MetroIncident[];
}

async function fetchMetroIncidents(): Promise<MetroIncidentsResponse> {
  const { data } = await api.get<MetroIncidentsResponse>('/metro/incidents');
  return data;
}

export function useMetroIncidents() {
  return useQuery({
    queryKey: ['metroIncidents'],
    queryFn: fetchMetroIncidents,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}
