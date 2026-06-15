import { STATION_ACCESSES } from '../data/stationAccesses';
import { normalizeStationId } from './normalizeStationId';

export function getAccessesForStation(stationId: string) {
  const normalizedStationId = normalizeStationId(stationId);

  return STATION_ACCESSES.filter(access =>
    normalizeStationId(access.stationId) === normalizedStationId,
  );
}
