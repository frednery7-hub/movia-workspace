import type { MetroLineId } from '@movia/shared-data/metro/line-directions';
import { POIS } from '../data/pois';

export function getPoisForLine(lineId: MetroLineId) {
  return POIS.filter(poi =>
    poi.recommendedStations.some(station =>
      station.lineIds.includes(lineId),
    ),
  );
}
