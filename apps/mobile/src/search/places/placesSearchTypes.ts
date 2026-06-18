export type PlaceAutocompleteResult = {
  id: string;
  placeId: string;
  primaryText: string;
  secondaryText: string | null;
  types: string[];
  matchedSubstrings: Array<{
    offset: number;
    length: number;
  }>;
  source: 'google_places';
};

export type PlaceDetailsResult = {
  id: string;
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  types: string[];
  source: 'google_places';
};

export type PlaceNearestStation = {
  id: string;
  name: string;
  lineIds: string[];
  distanceMeters: number;
};

export type PlaceDetailsResponse = {
  place: PlaceDetailsResult;
  nearestStation: PlaceNearestStation | null;
};

export type ResolvedPlaceDestination = {
  type: 'place';
  displayName: string;
  routeDestinationStationId: string;
  routeDestinationStationName: string;
  lineIds: string[];
  distanceMeters: number;
  placeId: string;
};
