import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { AddressSearchService } from './address-search.service';
import { AddressSearchCacheService } from './address-search-cache.service';
import { GoogleGeocodingClient } from './geocoding/google-geocoding.client';
import { StationNearestService } from './station-nearest.service';

@Module({
  controllers: [SearchController],
  providers: [
    AddressSearchService,
    AddressSearchCacheService,
    GoogleGeocodingClient,
    StationNearestService,
  ],
})
export class SearchModule {}
