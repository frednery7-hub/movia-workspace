import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AddressSearchQueryDto } from './dto/address-search-query.dto';
import { AddressSearchService } from './address-search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly addressSearch: AddressSearchService) {}

  @Throttle({ addressSearch: { ttl: 60_000, limit: 20 } })
  @Get('address')
  searchAddress(@Query() query: AddressSearchQueryDto) {
    return this.addressSearch.search(query.q);
  }
}
