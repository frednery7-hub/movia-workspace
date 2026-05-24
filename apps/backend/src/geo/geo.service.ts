import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

  async processUserLocation(
    userId: string,
    payload: UpdateLocationDto,
  ): Promise<LocationResponse> {
    const finalLat = payload.lat;
    const finalLng = payload.lng;
    let etaStatus: EtaStatus = 'ACTIVE';

    // ── Dead Reckoning: mobile reporta degradado + parado ────────
    if (payload.isDegraded && payload.isStationary && payload.lineId) {
      const isLineFaulty = await this.checkLineFaulty(String(payload.lineId));

      if (isLineFaulty) {
        this.logger.warn(
          `[User ${userId}] Dead Reckoning ativado na Linha ${payload.lineId}. Aplicando ancora.`,
        );
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

  /**
   * Consulta o banco para verificar se a linha esta com falha.
   * Por ora verifica se a linha existe — futuro: tabela network_state.
   */
  private async checkLineFaulty(lineId: string): Promise<boolean> {
    const line = await this.prisma.line.findUnique({
      where: { id: lineId },
    });
    // Linha nao encontrada no banco = considerar fora de operacao
    if (!line) return true;
    // TODO: quando tabela network_state existir:
    // return line.status === 'FAULTY';
    return false;
  }
}
