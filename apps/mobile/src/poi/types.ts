import type { MetroLineId } from '@movia/shared-data/metro/line-directions';

export type PoiCategory =
  | 'shopping'
  | 'wine'
  | 'religion'
  | 'government'
  | 'museum'
  | 'crafts'
  | 'market'
  | 'park'
  | 'airport'
  | 'culture'
  | 'tourism';

export type PoiAccessMode =
  | 'direct'
  | 'short_walk'
  | 'subway_connection'
  | 'bus_transfer'
  | 'taxi_or_app'
  | 'intermodal';

export type PoiRecommendedStation = {
  stationId: string;
  stationName: string;
  lineIds: MetroLineId[];
  isPrimary: boolean;
};

export type PointOfInterest = {
  id: string;
  name: string;
  aliases: string[];
  category: PoiCategory;
  recommendedStations: PoiRecommendedStation[];
  lastMile: {
    mode: PoiAccessMode;
    summary: string;
  };
  context: string;
  searchBoost?: number;
  googleMapsQuery?: string;
};

export type ResolvedPoiDestination = {
  type: 'poi';
  displayName: string;
  routeDestinationStationId: string;
  routeDestinationStationName: string;
  lineIds: MetroLineId[];
  poi: PointOfInterest;
};

export type StationAccess = {
  id: string;
  stationId: string;
  name: string;
  address: string;
  reference?: string;
  status?: 'available' | 'closed' | 'unknown';
  googleMapsQuery: string;
};
