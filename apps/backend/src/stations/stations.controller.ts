import { Controller, Get, Query } from '@nestjs/common';
import { StationsService } from './stations.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('stations')
export class StationsController {
  constructor(private readonly stations: StationsService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.stations.findAll(q);
  }
}
