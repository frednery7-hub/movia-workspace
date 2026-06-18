import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { AddressSearchQueryDto } from './dto/address-search-query.dto';
import { AddressSearchService } from './address-search.service';
import { PlaceAutocompleteQueryDto } from './places/dto/place-autocomplete.dto';
import { PlaceDetailsQueryDto } from './places/dto/place-details.dto';
import { PlacesAutocompleteService } from './places/places-autocomplete.service';
import { PlacesDetailsService } from './places/places-details.service';

@Public()
@Controller('search')
export class SearchController {
  constructor(
    private readonly addressSearch: AddressSearchService,
    private readonly placesAutocomplete: PlacesAutocompleteService,
    private readonly placesDetails: PlacesDetailsService,
  ) {}

  @Throttle({ addressSearch: { ttl: 60_000, limit: 20 } })
  @Get('address')
  searchAddress(@Query() query: AddressSearchQueryDto) {
    return this.addressSearch.search(query.q, query.originLineIds);
  }

  @Throttle({ addressSearch: { ttl: 60_000, limit: 30 } })
  @Get('places/autocomplete')
  searchPlacesAutocomplete(@Query() query: PlaceAutocompleteQueryDto) {
    return this.placesAutocomplete.search(query.q, query.sessionToken);
  }

  @Throttle({ addressSearch: { ttl: 60_000, limit: 20 } })
  @Get('places/details')
  searchPlaceDetails(@Query() query: PlaceDetailsQueryDto) {
    return this.placesDetails.resolve(
      query.placeId,
      query.sessionToken,
      query.originLineIds,
    );
  }
}
