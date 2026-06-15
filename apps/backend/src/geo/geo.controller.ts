import { Controller, Post, Body, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GeoService } from './geo.service';
import { UpdateLocationDto } from './dto/update-location.dto';

interface JwtRequest {
  user: { sub: string; deviceId: string };
}

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Throttle({ geoLocation: { ttl: 60_000, limit: 20 } })
  @Post('location')
  async updateLocation(
    @Request() req: JwtRequest,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.geoService.processUserLocation(req.user.sub, dto);
  }
}
