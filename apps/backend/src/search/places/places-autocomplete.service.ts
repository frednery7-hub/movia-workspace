import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GooglePlacesClient } from './google-places.client';
import {
  createPlacesCacheKey,
  normalizePlaceQuery,
  PlacesCacheService,
  PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS,
} from './places-cache.service';
import type { PlaceAutocompleteResponse } from './types/place-search-result.type';

@Injectable()
export class PlacesAutocompleteService {
  private readonly logger = new Logger(PlacesAutocompleteService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cache: PlacesCacheService,
    private readonly placesClient: GooglePlacesClient,
  ) {}

  async search(
    query: string,
    sessionToken?: string,
  ): Promise<PlaceAutocompleteResponse> {
    if (this.config.get<string>('PLACES_SEARCH_ENABLED') !== 'true') {
      throw new ServiceUnavailableException('Places search disabled.');
    }

    const normalizedQuery = normalizePlaceQuery(query);
    if (normalizedQuery.length < 3) return { results: [] };

    const cacheKey = this.createAutocompleteCacheKey(normalizedQuery);
    const cachedResults = this.cache.getAutocomplete(cacheKey);
    if (cachedResults) return { results: cachedResults };

    this.logger.log({
      event: 'places_autocomplete',
      queryLength: query.length,
    });

    const results = (
      await this.placesClient.autocomplete(normalizedQuery, sessionToken)
    ).slice(0, this.getMaxResults());

    this.cache.setAutocomplete(
      cacheKey,
      results,
      this.getAutocompleteCacheTtlSeconds(),
    );

    return { results };
  }

  private createAutocompleteCacheKey(normalizedQuery: string): string {
    return createPlacesCacheKey([
      'places',
      'autocomplete',
      normalizedQuery,
      this.config.get<string>('PLACES_COUNTRY_CODE') || 'CL',
      this.config.get<string>('PLACES_LOCATION_BIAS_LAT') || '-33.4489',
      this.config.get<string>('PLACES_LOCATION_BIAS_LNG') || '-70.6693',
      this.config.get<string>('PLACES_LOCATION_BIAS_RADIUS_METERS') || '35000',
    ]);
  }

  private getAutocompleteCacheTtlSeconds(): number {
    const value = Number(
      this.config.get<string>('PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS'),
    );
    return Number.isFinite(value) && value > 0
      ? value
      : PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS;
  }

  private getMaxResults(): number {
    const value = Number(this.config.get<string>('PLACES_MAX_RESULTS'));
    return Number.isFinite(value) && value > 0
      ? Math.min(Math.floor(value), 5)
      : 5;
  }
}
