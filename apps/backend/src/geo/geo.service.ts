import { Injectable, Logger } from '@nestjs/common';
import { UpdateLocationDto } from './dto/update-location.dto';

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

  async processUserLocation(
    userId: string,
    payload: UpdateLocationDto,
  ): Promise<LocationResponse> {
    const finalLat = payload.lat;
    const finalLng = payload.lng;
    let etaStatus: EtaStatus = 'ACTIVE';

    // ── Dead Reckoning: mobile reporta degradado + parado ────────
    if (payload.isDegraded && payload.isStationary && payload.lineId) {
      // TODO Sprint 6 completo: substituir mock por NetworkService.getLineStatus()
      const isLineFaulty = true;

      if (isLineFaulty) {
        this.logger.warn(
          `[User ${userId}] Dead Reckoning ativado na Linha ${payload.lineId}. Aplicando ancora.`,
        );

        // TODO: substituir por prisma.userLocation.findFirst({ where: { userId } })
        // finalLat = lastKnown.lat;
        // finalLng = lastKnown.lng;

        etaStatus = 'PAUSED_DUE_TO_FAULT';
      }
    }

    // ── Modo Degraded sem parada confirmada ───────────────────────
    if (payload.isDegraded && !payload.isStationary) {
      etaStatus = 'DEAD_RECKONING';
      this.logger.log(
        `[User ${userId}] Modo DEAD_RECKONING — confianca: ${payload.confidence}`,
      );
    }

    return {
      accepted: true,
      appliedLat: finalLat,
      appliedLng: finalLng,
      etaStatus,
    };
  }
}
