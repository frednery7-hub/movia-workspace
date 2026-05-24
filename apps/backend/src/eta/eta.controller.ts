import { Controller, Get, Param, Request } from '@nestjs/common';
import { EtaService } from './eta.service';

interface JwtRequest {
  user: { sub: string; deviceId: string };
}

@Controller('eta')
export class EtaController {
  constructor(private readonly etaService: EtaService) {}

  @Get(':destinationId')
  async getEta(
    @Request() req: JwtRequest,
    @Param('destinationId') destinationId: string,
  ) {
    return this.etaService.computeEta(req.user.sub, destinationId);
  }
}
