import type { NearestStationResult } from '../../types/address-search.types';

export type PlaceSearchSource = 'google_places';

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
  source: PlaceSearchSource;
};

export type PlaceAutocompleteResponse = {
  results: PlaceAutocompleteResult[];
};

export type PlaceDetailsResult = {
  id: string;
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  types: string[];
  source: PlaceSearchSource;
};

export type PlaceDetailsResponse = {
  place: PlaceDetailsResult;
  nearestStation: NearestStationResult | null;
};

export type GooglePlaceDetailsCandidate = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  types: string[];
};
