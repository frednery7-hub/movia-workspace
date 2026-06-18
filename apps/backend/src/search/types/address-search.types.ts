export type AddressSearchSource =
  | 'google_geocoding'
  | 'google_places'
  | 'cache';

export type AddressSearchResult = {
  id: string;
  label: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  nearestStation: {
    id: string;
    name: string;
    lineIds: string[];
    distanceMeters: number;
  };
  source: AddressSearchSource;
};

export type AddressSearchResponse = {
  results: AddressSearchResult[];
};

export type GeocodingCandidate = {
  id: string;
  label: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  provider: 'google_geocoding';
};

export type NearestStationInput = {
  latitude: number;
  longitude: number;
};

export type NearestStationResult = {
  id: string;
  name: string;
  lineIds: string[];
  distanceMeters: number;
};
