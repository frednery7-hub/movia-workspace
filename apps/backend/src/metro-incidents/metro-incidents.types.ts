export type MetroLineId = 'L1' | 'L2' | 'L3' | 'L4' | 'L4A' | 'L5' | 'L6';

export type MetroIncidentStatus =
  | 'normal'
  | 'delay'
  | 'partial'
  | 'interrupted'
  | 'unknown';

export type MetroIncidentSource = 'official-metro';

export interface MetroIncident {
  id: string;
  lineId: MetroLineId;
  status: MetroIncidentStatus;
  title: string;
  description?: string;
  source: MetroIncidentSource;
  scrapedAt: string;
  updatedAt: string;
}

export interface MetroIncidentsResponse {
  updatedAt: string;
  source: MetroIncidentSource;
  sourceUrl: 'https://www.metro.cl/el-viaje/estado-red';
  stale?: boolean;
  incidents: MetroIncident[];
}

export const METRO_LINE_IDS: MetroLineId[] = [
  'L1',
  'L2',
  'L3',
  'L4',
  'L4A',
  'L5',
  'L6',
];

export const METRO_INCIDENTS_SOURCE: MetroIncidentSource = 'official-metro';
export const METRO_INCIDENTS_SOURCE_URL =
  'https://www.metro.cl/el-viaje/estado-red' as const;
