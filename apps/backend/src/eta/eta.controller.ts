import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EtaService } from './eta.service';

interface JwtRequest {
  user: { sub: string; deviceId: string };
}

const STATION_ID_REGEX = /^st_[a-z0-9_]+$/;

@Controller('eta')
export class EtaController {
  constructor(private readonly etaService: EtaService) {}

  @Throttle({ eta: { ttl: 60_000, limit: 60 } })
  @Get(':destinationId')
  async getEta(
    @Request() req: JwtRequest,
    @Param('destinationId') destinationId: string,
    @Query('from') originStationId: string,
  ) {
    if (!STATION_ID_REGEX.test(destinationId)) {
      throw new BadRequestException('destinationId invalido.');
    }
    if (originStationId && !STATION_ID_REGEX.test(originStationId)) {
      throw new BadRequestException('from invalido.');
    }

    return this.etaService.computeEta(
      req.user.sub,
      originStationId ?? destinationId,
      destinationId,
    );
  }
}
