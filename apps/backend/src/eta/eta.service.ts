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
  AlternativeRouteReason,
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

    const { stationIds, lineIds } = this.buildPathFromSegments(route);

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

    const etaBreakdown = this.buildEtaBreakdown(result.breakdown);
    const routeDestinationStation =
      await this.getRouteDestinationStation(destinationId);

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
        route,
      ),
    );

    this.metrics.etaDurationMs.observe(Date.now() - startMs);
    this.logger.log(
      `ETA_COMPUTED — user:${maskId(userId)} rota:${originStationId}\u2192${destinationId} base:${baseDurationSeconds}s delay:${appliedDelaySeconds}s total:${totalEstimatedSeconds}s`,
    );

    return {
      destination: destinationId,
      requestedDestination: {
        type: 'station',
        label: routeDestinationStation.name,
      },
      routeDestinationStation,
      path,
      stationsCount: path.length,
      linesOnRoute,
      timing,
      etaBreakdown,
      arrivalTime,
      arrivalTimeOptimistic,
      prediction,
      status,
      routeDegraded: result.routeDegraded,
      routes,
    };
  }

  private async getRouteDestinationStation(destinationId: string): Promise<{
    id: string;
    name: string;
    lineIds: string[];
    distanceMeters: number;
  }> {
    const station = await this.prisma.station.findUnique({
      where: { id: destinationId },
      select: {
        id: true,
        name: true,
        platforms: {
          select: { lineId: true },
          orderBy: { lineId: 'asc' },
        },
      },
    });

    return {
      id: station?.id ?? destinationId,
      name:
        station?.name ?? this.stationsCache.get(destinationId) ?? destinationId,
      lineIds: station
        ? [...new Set(station.platforms.map((platform) => platform.lineId))]
        : [],
      distanceMeters: 0,
    };
  }

  private buildEtaBreakdown(breakdown: {
    rideSeconds: number;
    dwellSeconds: number;
    transferWalkSeconds: number;
    transferWaitSeconds: number;
    totalSeconds?: number;
    minTotalSeconds?: number;
    maxTotalSeconds?: number;
  }) {
    const toMinutes = (seconds: number) => Math.round(seconds / 60);
    const totalSeconds =
      breakdown.totalSeconds ??
      breakdown.rideSeconds +
        breakdown.dwellSeconds +
        breakdown.transferWalkSeconds +
        breakdown.transferWaitSeconds;
    return {
      rideMinutes: toMinutes(breakdown.rideSeconds),
      dwellMinutes: toMinutes(breakdown.dwellSeconds),
      transferWalkMinutes: toMinutes(breakdown.transferWalkSeconds),
      transferWaitMinutes: toMinutes(breakdown.transferWaitSeconds),
      totalMinutes: toMinutes(totalSeconds),
      minTotalMinutes:
        breakdown.minTotalSeconds === undefined
          ? undefined
          : toMinutes(breakdown.minTotalSeconds),
      maxTotalMinutes:
        breakdown.maxTotalSeconds === undefined
          ? undefined
          : toMinutes(breakdown.maxTotalSeconds),
    };
  }

  private buildPathFromSegments(
    route: NonNullable<ReturnType<RouteEngine['route']>>,
  ): { stationIds: string[]; lineIds: string[] } {
    const stationIds: string[] = [];
    const lineIds: string[] = [];
    for (const segment of route.segments) {
      if (segment.edge.type !== 'TRACK') continue;

      const lastIndex = stationIds.length - 1;
      const isNewLeg =
        lastIndex < 0 ||
        stationIds[lastIndex] !== segment.fromNode.stationId ||
        lineIds[lastIndex] !== segment.fromNode.lineId;

      if (isNewLeg) {
        stationIds.push(segment.fromNode.stationId);
        lineIds.push(segment.fromNode.lineId);
      }
      stationIds.push(segment.toNode.stationId);
      lineIds.push(segment.toNode.lineId);
    }
    return { stationIds, lineIds };
  }

  private buildRouteOption(
    route: NonNullable<ReturnType<RouteEngine['route']>>,
    type: EtaRouteOption['type'],
    lineStatuses: LineStatusMap,
    now: number,
    recommendedDurationSeconds: number,
    recommendedRoute: NonNullable<ReturnType<RouteEngine['route']>>,
  ): EtaRouteOption {
    const result = this.etaEngine.compute({ route, lineStatuses });
    const stationIds: string[] = [];
    const lineIds: string[] = [];

    for (const segment of route.segments) {
      if (segment.edge.type !== 'TRACK') continue;

      const lastIndex = stationIds.length - 1;
      const isNewLeg =
        lastIndex < 0 ||
        stationIds[lastIndex] !== segment.fromNode.stationId ||
        lineIds[lastIndex] !== segment.fromNode.lineId;

      if (isNewLeg) {
        stationIds.push(segment.fromNode.stationId);
        lineIds.push(segment.fromNode.lineId);
      }
      stationIds.push(segment.toNode.stationId);
      lineIds.push(segment.toNode.lineId);
    }

    const linesOnRoute = [...new Set(lineIds)];
    const totalEstimatedSeconds = result.etaSeconds;
    const etaBreakdown = this.buildEtaBreakdown(result.breakdown);
    const differenceMinutes = Math.max(
      0,
      Math.round((totalEstimatedSeconds - recommendedDurationSeconds) / 60),
    );
    const walkMeters = this.getRouteWalkMeters(route);
    const reasonCode =
      type === 'alternative'
        ? this.getAlternativeRouteReason(route, recommendedRoute, linesOnRoute)
        : undefined;

    return {
      id:
        type === 'recommended'
          ? 'recommended'
          : `alternative-${linesOnRoute.join('-')}`,
      type,
      label: type === 'recommended' ? 'recommended' : 'alternative',
      reason: reasonCode,
      reasonCode,
      summary: reasonCode
        ? {
            reason: reasonCode,
            differenceMinutes,
            label: 'alternative',
          }
        : undefined,
      differenceLabel:
        type === 'alternative' && differenceMinutes > 0
          ? `+${differenceMinutes} min`
          : undefined,
      durationMinutes: Math.max(1, Math.round(totalEstimatedSeconds / 60)),
      walkMeters,
      transfers: route.transferCount,
      path: stationIds.map((id, index) => ({
        id,
        name: this.stationsCache.get(id) ?? id,
        lineId: lineIds[index] ?? '',
      })),
      linesOnRoute,
      etaBreakdown,
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

  private getRouteWalkMeters(
    route: NonNullable<ReturnType<RouteEngine['route']>>,
  ): number {
    return route.segments.reduce(
      (sum, segment) =>
        segment.edge.type === 'WALK' ? sum + segment.edge.distanceMeters : sum,
      0,
    );
  }

  private getAlternativeRouteReason(
    route: NonNullable<ReturnType<RouteEngine['route']>>,
    recommendedRoute: NonNullable<ReturnType<RouteEngine['route']>>,
    linesOnRoute: string[],
  ): AlternativeRouteReason {
    const recommendedWalkMeters = this.getRouteWalkMeters(recommendedRoute);
    if (this.getRouteWalkMeters(route) < recommendedWalkMeters)
      return 'lessWalking';
    if (route.transferCount < recommendedRoute.transferCount)
      return 'fewerTransfers';

    const recommendedLines = new Set(
      recommendedRoute.segments
        .filter((segment) => segment.edge.type === 'TRACK')
        .map((segment) => segment.fromNode.lineId),
    );
    const usesDifferentLines =
      linesOnRoute.some((lineId) => !recommendedLines.has(lineId)) ||
      recommendedLines.size !== linesOnRoute.length;

    return usesDifferentLines ? 'differentLines' : 'simplerRoute';
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
