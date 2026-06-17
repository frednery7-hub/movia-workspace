import { POIS } from '../data/pois';
import { normalizeStationId } from './normalizeStationId';

export function getPoisForStation(stationId: string) {
  const normalizedStationId = normalizeStationId(stationId);

  return POIS.filter(poi =>
    poi.recommendedStations.some(station =>
      normalizeStationId(station.stationId) === normalizedStationId,
    ),
  );
}
