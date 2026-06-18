import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { AddressSearchService } from './address-search.service';
import { AddressSearchCacheService } from './address-search-cache.service';
import { GoogleGeocodingClient } from './geocoding/google-geocoding.client';
import { GooglePlacesClient } from './places/google-places.client';
import { PlacesAutocompleteService } from './places/places-autocomplete.service';
import { PlacesCacheService } from './places/places-cache.service';
import { PlacesDetailsService } from './places/places-details.service';
import { StationNearestService } from './station-nearest.service';

@Module({
  controllers: [SearchController],
  providers: [
    AddressSearchService,
    AddressSearchCacheService,
    GoogleGeocodingClient,
    GooglePlacesClient,
    PlacesAutocompleteService,
    PlacesCacheService,
    PlacesDetailsService,
    StationNearestService,
  ],
})
export class SearchModule {}
