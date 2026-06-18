import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GooglePlaceDetailsCandidate,
  PlaceAutocompleteResult,
} from './types/place-search-result.type';

type GooglePlacesText = {
  text?: string;
};

type GooglePlacesAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: GooglePlacesText;
      structuredFormat?: {
        mainText?: GooglePlacesText;
        secondaryText?: GooglePlacesText;
      };
      types?: string[];
    };
  }>;
};

type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: GooglePlacesText;
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  types?: string[];
};

@Injectable()
export class GooglePlacesClient {
  private readonly logger = new Logger(GooglePlacesClient.name);

  constructor(private readonly config: ConfigService) {}

  async autocomplete(
    query: string,
    sessionToken?: string,
  ): Promise<PlaceAutocompleteResult[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);

    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
          },
          body: JSON.stringify({
            input: query,
            includedRegionCodes: [this.getCountryCode().toLowerCase()],
            locationBias: {
              circle: {
                center: this.getLocationBiasCenter(),
                radius: this.getLocationBiasRadiusMeters(),
              },
            },
            ...(sessionToken ? { sessionToken } : {}),
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        this.logger.warn(`PLACES_AUTOCOMPLETE_HTTP_${response.status}`);
        return [];
      }

      const payload =
        (await response.json()) as GooglePlacesAutocompleteResponse;

      return (payload.suggestions ?? []).flatMap((suggestion) => {
        const prediction = suggestion.placePrediction;
        const placeId = prediction?.placeId;
        const primaryText =
          prediction?.structuredFormat?.mainText?.text ??
          prediction?.text?.text;
        if (!placeId || !primaryText) return [];

        return [
          {
            id: `google_places:${placeId}`,
            placeId,
            primaryText,
            secondaryText:
              prediction?.structuredFormat?.secondaryText?.text ?? null,
            types: prediction?.types ?? [],
            matchedSubstrings: [],
            source: 'google_places' as const,
          },
        ];
      });
    } catch {
      this.logger.warn('PLACES_AUTOCOMPLETE_REQUEST_FAILED');
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  async getDetails(
    placeId: string,
    sessionToken?: string,
  ): Promise<GooglePlaceDetailsCandidate | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = new URL(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    );
    if (sessionToken) url.searchParams.set('sessionToken', sessionToken);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);

    try {
      const response = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(`PLACES_DETAILS_HTTP_${response.status}`);
        return null;
      }

      const payload = (await response.json()) as GooglePlaceDetailsResponse;
      const latitude = payload.location?.latitude;
      const longitude = payload.location?.longitude;
      const name = payload.displayName?.text;

      if (
        !payload.id ||
        !name ||
        !payload.formattedAddress ||
        typeof latitude !== 'number' ||
        typeof longitude !== 'number'
      ) {
        return null;
      }

      return {
        placeId: payload.id,
        name,
        formattedAddress: payload.formattedAddress,
        latitude,
        longitude,
        types: payload.types ?? [],
      };
    } catch {
      this.logger.warn('PLACES_DETAILS_REQUEST_FAILED');
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getApiKey(): string | undefined {
    return (
      this.config.get<string>('GOOGLE_PLACES_API_KEY') ||
      this.config.get<string>('GOOGLE_GEOCODING_API_KEY')
    );
  }

  private getCountryCode(): string {
    return this.config.get<string>('PLACES_COUNTRY_CODE') || 'CL';
  }

  private getLocationBiasCenter(): { latitude: number; longitude: number } {
    const latitude = Number(
      this.config.get<string>('PLACES_LOCATION_BIAS_LAT'),
    );
    const longitude = Number(
      this.config.get<string>('PLACES_LOCATION_BIAS_LNG'),
    );

    return {
      latitude: Number.isFinite(latitude) ? latitude : -33.4489,
      longitude: Number.isFinite(longitude) ? longitude : -70.6693,
    };
  }

  private getLocationBiasRadiusMeters(): number {
    const value = Number(
      this.config.get<string>('PLACES_LOCATION_BIAS_RADIUS_METERS'),
    );
    return Number.isFinite(value) && value > 0 ? value : 35_000;
  }
}
