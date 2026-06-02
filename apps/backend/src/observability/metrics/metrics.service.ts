import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();

  // HTTP
  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duração das requisições HTTP em ms',
    labelNames: ['method', 'route', 'status'],
    buckets: [10, 50, 100, 250, 500, 1000, 2500],
    registers: [this.registry],
  });

  readonly authFailuresTotal = new Counter({
    name: 'auth_failures_total',
    help: 'Total de falhas de autenticação',
    labelNames: ['reason'],
    registers: [this.registry],
  });

  // ETA
  readonly etaRequestsTotal = new Counter({
    name: 'eta_requests_total',
    help: 'Total de requisições ETA',
    registers: [this.registry],
  });

  readonly etaNoRouteTotal = new Counter({
    name: 'eta_no_route_total',
    help: 'Total de rotas não encontradas',
    registers: [this.registry],
  });

  readonly etaDurationMs = new Histogram({
    name: 'eta_duration_ms',
    help: 'Duração do cálculo ETA em ms',
    buckets: [5, 10, 25, 50, 100, 250, 500],
    registers: [this.registry],
  });

  readonly etaPredictionAvailableTotal = new Counter({
    name: 'eta_prediction_available_total',
    help: 'ETAs com predição AI disponível',
    registers: [this.registry],
  });

  readonly etaPredictionMissTotal = new Counter({
    name: 'eta_prediction_miss_total',
    help: 'ETAs sem predição AI',
    registers: [this.registry],
  });

  // AI Engine
  readonly aiCyclesTotal = new Counter({
    name: 'ai_cycles_total',
    help: 'Total de ciclos AI',
    registers: [this.registry],
  });

  readonly aiPredictionsTotal = new Counter({
    name: 'ai_predictions_total',
    help: 'Total de predições geradas',
    registers: [this.registry],
  });

  readonly aiCycleDurationMs = new Histogram({
    name: 'ai_cycle_duration_ms',
    help: 'Duração dos ciclos AI em ms',
    buckets: [10, 50, 100, 250, 500, 1000],
    registers: [this.registry],
  });

  readonly aiDatasetEmptyTotal = new Counter({
    name: 'ai_dataset_empty_total',
    help: 'Ciclos AI com dataset vazio',
    registers: [this.registry],
  });

  // Ingestion
  readonly ingestionEventsTotal = new Counter({
    name: 'ingestion_events_total',
    help: 'Total de eventos ingeridos',
    labelNames: ['source'],
    registers: [this.registry],
  });

  readonly ingestionRejectedTotal = new Counter({
    name: 'ingestion_rejected_total',
    help: 'Total de eventos rejeitados',
    labelNames: ['reason'],
    registers: [this.registry],
  });

  readonly ingestionSourceFailuresTotal = new Counter({
    name: 'ingestion_source_failures_total',
    help: 'Falhas por fonte de ingestão',
    labelNames: ['source'],
    registers: [this.registry],
  });

  readonly ingestionDurationMs = new Histogram({
    name: 'ingestion_duration_ms',
    help: 'Duração do ciclo de ingestão em ms',
    buckets: [50, 100, 250, 500, 1000, 2500],
    registers: [this.registry],
  });

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
