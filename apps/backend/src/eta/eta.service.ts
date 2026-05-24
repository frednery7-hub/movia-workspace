import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EtaEngine } from '@movia/route-engine';
import type { LineStatusMap } from '@movia/route-engine';

export interface EtaResponse {
  destination: string;
  etaSeconds: number;
  arrivalTime: Date;
  confidence: number;
  routeDegraded: boolean;
}

@Injectable()
export class EtaService {
  private readonly logger = new Logger(EtaService.name);
  private readonly etaEngine = new EtaEngine();

  constructor(private readonly prisma: PrismaService) {}

  async computeEta(
    userId: string,
    destinationId: string,
  ): Promise<EtaResponse> {
    // ── Busca estado das linhas (mock — substituir por NetworkService) ──
    const lineStatuses: LineStatusMap = await this.getLineStatuses();

    // ── Busca rota salva do usuario (mock — substituir por RouteEngine) ──
    // TODO: recuperar rota real via RouteEngine.route({ origin, destination })
    const mockRoute = this.buildMockRoute(destinationId);

    const result = this.etaEngine.compute({
      route: mockRoute,
      lineStatuses,
    });

    if (result.etaSeconds === Infinity) {
      this.logger.warn(
        `[User ${userId}] ETA para ${destinationId} retornou Infinity — linha com falha critica.`,
      );
    }

    return {
      destination: destinationId,
      etaSeconds: result.etaSeconds,
      arrivalTime: result.arrivalTime,
      confidence: result.confidence,
      routeDegraded: result.routeDegraded,
    };
  }

  // ── Mock de status das linhas — substituir por tabela network_state ──
  private async getLineStatuses(): Promise<LineStatusMap> {
    const lines = await this.prisma.line.findMany({ select: { id: true } });
    return Object.fromEntries(lines.map((l) => [l.id, 'NORMAL' as const]));
  }

  // ── Mock de rota — substituir por RouteEngine.route() ────────────────
  private buildMockRoute(destinationId: string) {
    return {
      segments: [],
      totalCost: 0,
      totalDurationSeconds: 0,
      totalDistanceMeters: 0,
      transferCount: 0,
      accessible: true,
    };
  }
}
