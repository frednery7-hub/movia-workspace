import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeocodingCandidate } from '../types/address-search.types';

type GoogleGeocodingResponse = {
  results?: Array<{
    place_id?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
  status?: string;
};

@Injectable()
export class GoogleGeocodingClient {
  private readonly logger = new Logger(GoogleGeocodingClient.name);

  constructor(private readonly config: ConfigService) {}

  async searchAddress(query: string): Promise<GeocodingCandidate[]> {
    const apiKey = this.config.get<string>('GOOGLE_GEOCODING_API_KEY');
    if (!apiKey) return [];

    const scopedQuery = `${query}, Santiago, Región Metropolitana, Chile`;
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', scopedQuery);
    url.searchParams.set('language', 'es');
    url.searchParams.set('region', 'cl');
    url.searchParams.set('components', 'country:CL');
    url.searchParams.set('key', apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        this.logger.warn(`GEOCODING_HTTP_${response.status}`);
        return [];
      }

      const payload = (await response.json()) as GoogleGeocodingResponse;
      if (payload.status && !['OK', 'ZERO_RESULTS'].includes(payload.status)) {
        this.logger.warn(`GEOCODING_STATUS_${payload.status}`);
      }

      return (payload.results ?? []).flatMap((result, index) => {
        const latitude = result.geometry?.location?.lat;
        const longitude = result.geometry?.location?.lng;
        const formattedAddress = result.formatted_address;
        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          !formattedAddress
        ) {
          return [];
        }

        return [
          {
            id: result.place_id ?? `google_geocoding_${index}`,
            label: query,
            formattedAddress,
            latitude,
            longitude,
            provider: 'google_geocoding' as const,
          },
        ];
      });
    } catch {
      this.logger.warn('GEOCODING_REQUEST_FAILED');
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
