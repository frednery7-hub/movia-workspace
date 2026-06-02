import { Controller, Post, Body, Request } from '@nestjs/common';
import { GeoService } from './geo.service';
import { UpdateLocationDto } from './dto/update-location.dto';

interface JwtRequest {
  user: { sub: string; deviceId: string };
}

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Post('location')
  async updateLocation(
    @Request() req: JwtRequest,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.geoService.processUserLocation(req.user.sub, dto);
  }
}
