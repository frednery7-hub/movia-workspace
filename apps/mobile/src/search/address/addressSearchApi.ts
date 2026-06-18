import { AxiosError } from 'axios';
import { api } from '../../config/api';

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
  source: 'google_geocoding' | 'google_places' | 'cache';
};

export type ResolvedAddressDestination = {
  type: 'address';
  displayName: string;
  routeDestinationStationId: string;
  routeDestinationStationName: string;
  lineIds: string[];
  distanceMeters: number;
  addressId: string;
};

type AddressSearchResponse = {
  results: AddressSearchResult[];
};

export function shouldSearchAddressQuery(query: string): boolean {
  return query.trim().length >= 3;
}

export function formatAddressDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1).replace('.', ',')} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

export function resolveAddressDestination(
  result: AddressSearchResult,
): ResolvedAddressDestination {
  return {
    type: 'address',
    displayName: result.label,
    routeDestinationStationId: result.nearestStation.id,
    routeDestinationStationName: result.nearestStation.name,
    lineIds: result.nearestStation.lineIds,
    distanceMeters: result.nearestStation.distanceMeters,
    addressId: result.id,
  };
}

export async function searchAddress(
  query: string,
  options: { signal?: AbortSignal; originLineIds?: string[] } = {},
): Promise<AddressSearchResult[]> {
  if (!shouldSearchAddressQuery(query)) return [];

  try {
    const { data } = await api.get<AddressSearchResponse>('/search/address', {
      params: {
        q: query.trim(),
        ...(options.originLineIds && options.originLineIds.length > 0
          ? { originLineIds: options.originLineIds.join(',') }
          : {}),
      },
      signal: options.signal,
    });
    return data.results;
  } catch (error) {
    if (error instanceof AxiosError && error.code === 'ERR_CANCELED') {
      return [];
    }
    return [];
  }
}
