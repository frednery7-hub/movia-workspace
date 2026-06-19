import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { EtaEngine, RouteEngine } from '@movia/route-engine';
import type { LineStatusMap } from '@movia/route-engine';
import type { NearestEntranceResult } from '@movia/shared-types';
import { maskId } from '../common/mask.util';
import {
  EnrichedEtaResponse,
  EtaRouteStatus,
  EtaTiming,
  EtaPrediction,
  EtaRouteOption,
} from './dto/enriched-eta-response.dto';
import { LineStatus } from '@prisma/client';
import { AiPrediction } from '../ai-engine/dto/prediction.dto';
import { MetricsService } from '../observability/metrics/metrics.service';

const AI_MODEL_VERSION = 'EWMA_V1';

@Injectable()
export class EtaService implements OnModuleInit {
  private readonly logger = new Logger(EtaService.name);
  private readonly etaEngine = new EtaEngine();
  private routeEngine!: RouteEngine;
  private stationsCache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphService: GraphService,
    private readonly aiEngine: AiEngineService,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Inicializando motor de rotas e cache de estacoes...');
    await this.reloadEngine();
    this.logger.log(`Cache carregado com ${this.stationsCache.size} estacoes.`);
  }

  async reloadEngine(): Promise<void> {
    const graph = this.graphService.getGraph();
    this.routeEngine = new RouteEngine(graph);
    const allStations = await this.prisma.station.findMany({
      select: { id: true, name: true },
    });
    this.stationsCache.clear();
    allStations.forEach((s) => this.stationsCache.set(s.id, s.name));
    this.logger.log(
      `RouteEngine reinicializado — ${graph.nodes.size} nos, ${this.stationsCache.size} estacoes em cache.`,
    );
  }

  async computeEta(
    userId: string,
    originStationId: string,
    destinationId: string,
  ): Promise<EnrichedEtaResponse> {
    const startMs = Date.now();
    this.metrics.etaRequestsTotal.inc();

    const lineStatuses = await this.getLineStatuses();

    if (!this.stationsCache.has(originStationId)) {
      throw new NotFoundException(
        `Estacao origem nao encontrada: ${originStationId}`,
      );
    }
    if (!this.stationsCache.has(destinationId)) {
      throw new NotFoundException(
        `Estacao destino nao encontrada: ${destinationId}`,
      );
    }

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

    const routeOptions = this.routeEngine.routeOptions({ origin, destination });
    const route = routeOptions[0];
    if (!route) {
      this.metrics.etaNoRouteTotal.inc();
      throw new NotFoundException(
        `Sem rota disponivel de ${originStationId} para ${destinationId}`,
      );
    }

    const result = this.etaEngine.compute({ route, lineStatuses });

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

    const linesOnRoute = [...new Set(lineIds)];
    const path = stationIds.map((id, index) => ({
      id,
      name: this.stationsCache.get(id) ?? id,
      lineId: lineIds[index] ?? '',
    }));

    const currentDelaySeconds = this.computeCurrentDelay(
      linesOnRoute,
      lineStatuses,
    );
    const prediction = this.buildPrediction(linesOnRoute);
    const predictedDelaySeconds =
      prediction.available && prediction.predictedStatus !== LineStatus.NORMAL
        ? Math.round(prediction.confidence * 180)
        : 0;

    const baseDurationSeconds = result.etaSeconds;
    const appliedDelaySeconds = Math.max(
      currentDelaySeconds,
      predictedDelaySeconds,
    );
    const totalEstimatedSeconds = baseDurationSeconds + appliedDelaySeconds;

    const timing: EtaTiming = {
      baseDurationSeconds,
      currentDelaySeconds,
      predictedDelaySeconds,
      appliedDelaySeconds,
      totalEstimatedSeconds,
    };

    const now = Date.now();
    const arrivalTime = new Date(
      now + totalEstimatedSeconds * 1000,
    ).toISOString();
    const arrivalTimeOptimistic = new Date(
      now + baseDurationSeconds * 1000,
    ).toISOString();
    const status = this.computeRouteStatus(
      lineStatuses,
      linesOnRoute,
      result.routeDegraded,
    );
    const routes = routeOptions.map((option, index) =>
      this.buildRouteOption(
        option,
        index === 0 ? 'recommended' : 'alternative',
        lineStatuses,
        now,
        result.etaSeconds,
      ),
    );

    this.metrics.etaDurationMs.observe(Date.now() - startMs);
    this.logger.log(
      `ETA_COMPUTED — user:${maskId(userId)} rota:${originStationId}\u2192${destinationId} base:${baseDurationSeconds}s delay:${appliedDelaySeconds}s total:${totalEstimatedSeconds}s`,
    );

    return {
      destination: destinationId,
      path,
      stationsCount: path.length,
      linesOnRoute,
      timing,
      arrivalTime,
      arrivalTimeOptimistic,
      prediction,
      status,
      routeDegraded: result.routeDegraded,
      routes,
    };
  }

  private buildRouteOption(
    route: NonNullable<ReturnType<RouteEngine['route']>>,
    type: EtaRouteOption['type'],
    lineStatuses: LineStatusMap,
    now: number,
    recommendedDurationSeconds: number,
  ): EtaRouteOption {
    const result = this.etaEngine.compute({ route, lineStatuses });
    const stationIds: string[] = [];
    const lineIds: string[] = [];

    for (const segment of route.segments) {
      if (segment.edge.type !== 'TRACK') continue;
      if (stationIds.length === 0) {
        stationIds.push(segment.fromNode.stationId);
        lineIds.push(segment.fromNode.lineId);
      }
      stationIds.push(segment.toNode.stationId);
      lineIds.push(segment.toNode.lineId);
    }

    const linesOnRoute = [...new Set(lineIds)];
    const totalEstimatedSeconds = result.etaSeconds;
    const differenceMinutes = Math.max(
      0,
      Math.round((totalEstimatedSeconds - recommendedDurationSeconds) / 60),
    );

    return {
      id:
        type === 'recommended'
          ? 'recommended'
          : `alternative-${linesOnRoute.join('-')}`,
      type,
      label: type === 'recommended' ? 'Ruta recomendada' : 'Ruta alternativa',
      reason:
        type === 'alternative'
          ? route.transferCount === 0
            ? 'Sin combinaciones'
            : 'Recorrido por líneas diferentes'
          : undefined,
      differenceLabel:
        type === 'alternative' && differenceMinutes > 0
          ? `+${differenceMinutes} min`
          : undefined,
      durationMinutes: Math.max(1, Math.round(totalEstimatedSeconds / 60)),
      walkMeters: route.segments.reduce(
        (sum, segment) =>
          segment.edge.type === 'WALK'
            ? sum + segment.edge.distanceMeters
            : sum,
        0,
      ),
      transfers: route.transferCount,
      path: stationIds.map((id, index) => ({
        id,
        name: this.stationsCache.get(id) ?? id,
        lineId: lineIds[index] ?? '',
      })),
      linesOnRoute,
      timing: {
        baseDurationSeconds: totalEstimatedSeconds,
        currentDelaySeconds: 0,
        predictedDelaySeconds: 0,
        appliedDelaySeconds: 0,
        totalEstimatedSeconds,
      },
      arrivalTime: new Date(now + totalEstimatedSeconds * 1000).toISOString(),
    };
  }

  private buildPrediction(linesOnRoute: string[]): EtaPrediction {
    const predictions = linesOnRoute
      .map((lineId) => this.aiEngine.getPrediction(lineId))
      .filter((p): p is AiPrediction => p !== null);

    if (predictions.length === 0) {
      this.metrics.etaPredictionMissTotal.inc();
      return {
        available: false,
        model: AI_MODEL_VERSION,
        confidence: 0,
        predictedStatus: LineStatus.NORMAL,
        linesAnalyzed: linesOnRoute,
      };
    }

    this.metrics.etaPredictionAvailableTotal.inc();
    const worst = predictions.reduce((prev, curr) =>
      curr.predictedDelaySeconds > prev.predictedDelaySeconds ? curr : prev,
    );
    return {
      available: true,
      model: AI_MODEL_VERSION,
      confidence: worst.confidence,
      predictedStatus: worst.predictedStatus,
      linesAnalyzed: linesOnRoute,
    };
  }

  private computeCurrentDelay(
    linesOnRoute: string[],
    lineStatuses: LineStatusMap,
  ): number {
    let maxDelay = 0;
    for (const lineId of linesOnRoute) {
      const status = lineStatuses[lineId] as LineStatus;
      if (status === LineStatus.DELAYED) maxDelay = Math.max(maxDelay, 120);
      if (status === LineStatus.FAULTY) maxDelay = Math.max(maxDelay, 300);
    }
    return maxDelay;
  }

  private computeRouteStatus(
    lineStatuses: LineStatusMap,
    linesOnRoute: string[],
    routeDegraded: boolean,
  ): EtaRouteStatus {
    if (routeDegraded) return 'NO_ROUTE';
    const statuses = linesOnRoute.map((id) => lineStatuses[id] as LineStatus);
    if (statuses.some((s) => s === LineStatus.SUSPENDED)) return 'DEGRADED';
    if (statuses.some((s) => s === LineStatus.FAULTY)) return 'DEGRADED';
    if (statuses.some((s) => s === LineStatus.DELAYED)) return 'DELAYED';
    return 'NORMAL';
  }

  private async getLineStatuses(): Promise<LineStatusMap> {
    const states = await this.prisma.networkState.findMany({
      select: { lineId: true, status: true },
    });
    if (states.length === 0) {
      this.logger.warn(
        'NETWORK_STATE_EMPTY_FALLBACK — NetworkState vazio. Operando com status NORMAL para todas as linhas.',
      );
      const lines = await this.prisma.line.findMany({ select: { id: true } });
      return Object.fromEntries(lines.map((l) => [l.id, 'NORMAL' as const]));
    }
    return Object.fromEntries(
      states.map((s) => [s.lineId, s.status]),
    ) as LineStatusMap;
  }
}
