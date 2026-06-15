import type { PointOfInterest, ResolvedPoiDestination } from '../types';

export function resolvePoiDestination(poi: PointOfInterest): ResolvedPoiDestination {
  const primaryStation =
    poi.recommendedStations.find(station => station.isPrimary) ??
    poi.recommendedStations[0];

  return {
    type: 'poi',
    displayName: poi.name,
    routeDestinationStationId: primaryStation.stationId,
    routeDestinationStationName: primaryStation.stationName,
    lineIds: primaryStation.lineIds,
    poi,
  };
}
