import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createAddressQueryHash,
  getSafeAddressQueryLogMeta,
  normalizeAddressQuery,
} from './address-query.util';
import {
  AddressSearchCacheService,
  ADDRESS_SEARCH_CACHE_TTL_SECONDS,
} from './address-search-cache.service';
import { GoogleGeocodingClient } from './geocoding/google-geocoding.client';
import { StationNearestService } from './station-nearest.service';
import { originLineIdsCacheKeyPart } from './line-id.util';
import type {
  AddressSearchResponse,
  AddressSearchResult,
} from './types/address-search.types';

@Injectable()
export class AddressSearchService {
  private readonly logger = new Logger(AddressSearchService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cache: AddressSearchCacheService,
    private readonly geocoding: GoogleGeocodingClient,
    private readonly stationNearest: StationNearestService,
  ) {}

  async search(
    query: string,
    originLineIds?: string[],
  ): Promise<AddressSearchResponse> {
    if (this.config.get<string>('ADDRESS_SEARCH_ENABLED') !== 'true') {
      throw new ServiceUnavailableException('Address search disabled.');
    }

    const normalizedQuery = normalizeAddressQuery(query);
    const queryHash = createAddressQueryHash(
      `${normalizedQuery}|${originLineIdsCacheKeyPart(originLineIds)}`,
    );
    this.logger.log(getSafeAddressQueryLogMeta(query));

    const cachedResults = this.cache.get(queryHash);
    if (cachedResults) {
      return { results: cachedResults };
    }

    const maxResults = this.getMaxResults();
    const candidates = await this.geocoding.searchAddress(normalizedQuery);
    const results: AddressSearchResult[] = [];

    for (const candidate of candidates.slice(0, maxResults)) {
      const nearestStation = await this.stationNearest.findNearestStation({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        originLineIds,
      });

      results.push({
        id: candidate.id,
        label: candidate.label,
        formattedAddress: candidate.formattedAddress,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        nearestStation,
        source: candidate.provider,
      });
    }

    const orderedResults = results
      .sort(
        (a, b) =>
          a.nearestStation.distanceMeters - b.nearestStation.distanceMeters,
      )
      .slice(0, maxResults);

    this.cache.set(queryHash, orderedResults, this.getCacheTtlSeconds());
    return { results: orderedResults };
  }

  private getCacheTtlSeconds(): number {
    const value = Number(
      this.config.get<string>('ADDRESS_SEARCH_CACHE_TTL_SECONDS'),
    );
    return Number.isFinite(value) && value > 0
      ? value
      : ADDRESS_SEARCH_CACHE_TTL_SECONDS;
  }

  private getMaxResults(): number {
    const value = Number(this.config.get<string>('ADDRESS_SEARCH_MAX_RESULTS'));
    return Number.isFinite(value) && value > 0
      ? Math.min(Math.floor(value), 10)
      : 5;
  }
}
