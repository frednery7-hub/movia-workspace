import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { maskId, maskLocation } from '../common/mask.util';

export interface LocationResponse {
  accepted: boolean;
  appliedLat: number;
  appliedLng: number;
  etaStatus: EtaStatus;
}

export type EtaStatus = 'ACTIVE' | 'PAUSED_DUE_TO_FAULT' | 'DEAD_RECKONING';

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processUserLocation(
    userId: string,
    payload: UpdateLocationDto,
  ): Promise<LocationResponse> {
    const finalLat = payload.lat;
    const finalLng = payload.lng;
    let etaStatus: EtaStatus = 'ACTIVE';

    if (payload.isDegraded && payload.isStationary && payload.lineId) {
      const isLineFaulty = await this.checkLineFaulty(String(payload.lineId));

      if (isLineFaulty) {
        this.logger.warn(
          `Dead Reckoning ativado — user: ${maskId(userId)} linha: ${payload.lineId} pos: ${maskLocation(payload.lat, payload.lng)}`,
        );
        etaStatus = 'PAUSED_DUE_TO_FAULT';
      }
    }

    if (payload.isDegraded && !payload.isStationary) {
      etaStatus = 'DEAD_RECKONING';
      this.logger.log(
        `DEAD_RECKONING — user: ${maskId(userId)} conf: ${payload.confidence}`,
      );
    }

    return {
      accepted: true,
      appliedLat: finalLat,
      appliedLng: finalLng,
      etaStatus,
    };
  }

  private async checkLineFaulty(lineId: string): Promise<boolean> {
    const line = await this.prisma.line.findUnique({ where: { id: lineId } });
    if (!line) return true;
    return false;
  }
}
