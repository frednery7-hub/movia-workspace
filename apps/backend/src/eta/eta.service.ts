import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { EtaEngine, RouteEngine } from '@movia/route-engine';
import type { LineStatusMap } from '@movia/route-engine';
import type { NearestEntranceResult } from '@movia/shared-types';
import { maskId } from '../common/mask.util';

export interface RouteStation {
  id: string;
  name: string;
  lineId: string;
}

export interface EtaResponse {
  destination: string;
  etaSeconds: number;
  arrivalTime: Date;
  confidence: number;
  routeDegraded: boolean;
  stationsCount: number;
  path: RouteStation[];
}

@Injectable()
export class EtaService {
  private readonly logger = new Logger(EtaService.name);
  private readonly etaEngine = new EtaEngine();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphService: GraphService,
  ) {}

  async computeEta(
    userId: string,
    originStationId: string,
    destinationId: string,
  ): Promise<EtaResponse> {
    const graph = this.graphService.getGraph();
    const lineStatuses = await this.getLineStatuses();

    const originStation = await this.prisma.station.findUnique({
      where: { id: originStationId },
    });
    const destStation = await this.prisma.station.findUnique({
      where: { id: destinationId },
    });

    if (!originStation)
      throw new NotFoundException(
        `Estacao origem nao encontrada: ${originStationId}`,
      );
    if (!destStation)
      throw new NotFoundException(
        `Estacao destino nao encontrada: ${destinationId}`,
      );

    const origin: NearestEntranceResult = {
      stationId: originStationId,
      entranceId: null,
      distanceMeters: 0,
      displacementVectorMeters: 0,
      fallbackActivated: false,
      locationUsed: {} as never,
      confidence: { nearestStationConfidence: 1, snappingConfidence: 1 },
    };

    const destination: NearestEntranceResult = {
      stationId: destinationId,
      entranceId: null,
      distanceMeters: 0,
      displacementVectorMeters: 0,
      fallbackActivated: false,
      locationUsed: {} as never,
      confidence: { nearestStationConfidence: 1, snappingConfidence: 1 },
    };

    const routeEngine = new RouteEngine(graph);
    const route = routeEngine.route({ origin, destination });

    if (!route) {
      throw new NotFoundException(
        `Sem rota disponivel de ${originStationId} para ${destinationId}`,
      );
    }

    const result = this.etaEngine.compute({ route, lineStatuses });

    // Extrai estações únicas em ordem dos segmentos TRACK
    const stationIds: string[] = [];
    const lineIds: string[] = [];

    for (const segment of route.segments) {
      if (segment.edge.type === 'TRACK') {
        if (stationIds.length === 0) {
          stationIds.push(segment.fromNode.stationId);
          lineIds.push(segment.fromNode.lineId);
        }
        stationIds.push(segment.toNode.stationId);
        lineIds.push(segment.toNode.lineId);
      }
    }

    const stations = await this.prisma.station.findMany({
      where: { id: { in: stationIds } },
      select: { id: true, name: true },
    });
    const stationMap = Object.fromEntries(stations.map((s) => [s.id, s.name]));

    const path: RouteStation[] = stationIds.map((id, index) => ({
      id,
      name: stationMap[id] ?? id,
      lineId: lineIds[index] ?? '',
    }));

    this.logger.log(
      `ETA calculado — user: ${maskId(userId)} rota: ${originStationId}→${destinationId} eta: ${result.etaSeconds}s`,
    );

    return {
      destination: destinationId,
      etaSeconds: result.etaSeconds,
      arrivalTime: result.arrivalTime,
      confidence: result.confidence,
      routeDegraded: result.routeDegraded,
      stationsCount: path.length,
      path,
    };
  }

  private async getLineStatuses(): Promise<LineStatusMap> {
    const lines = await this.prisma.line.findMany({ select: { id: true } });
    return Object.fromEntries(lines.map((l) => [l.id, 'NORMAL' as const]));
  }
}
