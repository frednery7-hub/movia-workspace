import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StationNearestService } from '../station-nearest.service';
import { originLineIdsCacheKeyPart } from '../line-id.util';
import { GooglePlacesClient } from './google-places.client';
import {
  createPlacesCacheKey,
  PlacesCacheService,
  PLACES_DETAILS_CACHE_TTL_SECONDS,
} from './places-cache.service';
import type { PlaceDetailsResponse } from './types/place-search-result.type';

@Injectable()
export class PlacesDetailsService {
  private readonly logger = new Logger(PlacesDetailsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cache: PlacesCacheService,
    private readonly placesClient: GooglePlacesClient,
    private readonly stationNearest: StationNearestService,
  ) {}

  async resolve(
    placeId: string,
    sessionToken?: string,
    originLineIds?: string[],
  ): Promise<PlaceDetailsResponse> {
    if (this.config.get<string>('PLACES_SEARCH_ENABLED') !== 'true') {
      throw new ServiceUnavailableException('Places search disabled.');
    }

    const cacheKey = createPlacesCacheKey([
      'places',
      'details',
      placeId,
      originLineIdsCacheKeyPart(originLineIds),
    ]);
    const cachedDetails = this.cache.getDetails(cacheKey);
    if (cachedDetails) return cachedDetails;

    const candidate = await this.placesClient.getDetails(placeId, sessionToken);
    if (!candidate) {
      throw new BadGatewayException('Place details unavailable.');
    }

    const nearestStation = await this.stationNearest
      .findNearestStation({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        originLineIds,
      })
      .catch((error: unknown) => {
        this.logger.warn({
          event: 'places_nearest_station_failed',
          placeIdHash: createPlacesCacheKey(['place-id', placeId]),
          errorName:
            error instanceof Error ? error.constructor.name : 'UnknownError',
        });
        return null;
      });

    const response: PlaceDetailsResponse = {
      place: {
        id: `google_places:${candidate.placeId}`,
        placeId: candidate.placeId,
        name: candidate.name,
        formattedAddress: candidate.formattedAddress,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        types: candidate.types,
        source: 'google_places',
      },
      nearestStation,
    };

    this.cache.setDetails(cacheKey, response, this.getDetailsCacheTtlSeconds());

    return response;
  }

  private getDetailsCacheTtlSeconds(): number {
    const value = Number(
      this.config.get<string>('PLACES_DETAILS_CACHE_TTL_SECONDS'),
    );
    return Number.isFinite(value) && value > 0
      ? value
      : PLACES_DETAILS_CACHE_TTL_SECONDS;
  }
}
