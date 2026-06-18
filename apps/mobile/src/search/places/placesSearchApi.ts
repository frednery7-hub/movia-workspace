import { AxiosError } from 'axios';
import { api } from '../../config/api';
import type {
  PlaceAutocompleteResult,
  PlaceDetailsResponse,
  ResolvedPlaceDestination,
} from './placesSearchTypes';

type PlacesAutocompleteResponse = {
  results: PlaceAutocompleteResult[];
};

export function createPlacesSessionToken(): string {
  return `movia-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function shouldSearchPlacesQuery(query: string): boolean {
  return query.trim().length >= 3;
}

export function resolvePlaceDestination(
  result: PlaceDetailsResponse,
): ResolvedPlaceDestination | null {
  if (!result.nearestStation) return null;

  return {
    type: 'place',
    displayName: result.place.name,
    routeDestinationStationId: result.nearestStation.id,
    routeDestinationStationName: result.nearestStation.name,
    lineIds: result.nearestStation.lineIds,
    distanceMeters: result.nearestStation.distanceMeters,
    placeId: result.place.placeId,
  };
}

export async function searchPlacesAutocomplete(
  query: string,
  options: { sessionToken?: string; signal?: AbortSignal } = {},
): Promise<PlaceAutocompleteResult[]> {
  if (!shouldSearchPlacesQuery(query)) return [];

  try {
    const { data } = await api.get<PlacesAutocompleteResponse>(
      '/search/places/autocomplete',
      {
        params: {
          q: query.trim(),
          ...(options.sessionToken ? { sessionToken: options.sessionToken } : {}),
        },
        signal: options.signal,
      },
    );
    return data.results;
  } catch (error) {
    if (error instanceof AxiosError && error.code === 'ERR_CANCELED') {
      return [];
    }
    return [];
  }
}

export async function getPlaceDetails(
  placeId: string,
  options: { sessionToken?: string; signal?: AbortSignal } = {},
): Promise<PlaceDetailsResponse | null> {
  try {
    const { data } = await api.get<PlaceDetailsResponse>(
      '/search/places/details',
      {
        params: {
          placeId,
          ...(options.sessionToken ? { sessionToken: options.sessionToken } : {}),
        },
        signal: options.signal,
      },
    );
    return data;
  } catch (error) {
    if (error instanceof AxiosError && error.code === 'ERR_CANCELED') {
      return null;
    }
    return null;
  }
}
