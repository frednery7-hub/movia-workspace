import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NetworkStateService } from '../network-state/network-state.service';
import { GtfsAdapter } from './adapters/gtfs.adapter';
import { TransitEventValidator } from './validators/transit-event.validator';
import { getActiveSources } from './source-registry';
import { NetworkStateSourceType } from '@prisma/client';

@Injectable()
export class IngestionService implements OnModuleDestroy {
  private readonly logger = new Logger(IngestionService.name);
  private running = false;

  constructor(
    private readonly gtfsAdapter: GtfsAdapter,
    private readonly validator: TransitEventValidator,
    private readonly networkStateService: NetworkStateService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runIngestionCycle(): Promise<void> {
    if (this.running) {
      this.logger.warn('INGESTION_SKIPPED — ciclo anterior ainda em execucao');
      return;
    }

    const sources = getActiveSources();

    if (sources.length === 0) {
      this.logger.debug('INGESTION_NOOP — nenhuma fonte ativa configurada');
      return;
    }

    this.running = true;

    try {
      for (const source of sources) {
        await this.processSource(source.id);
      }
    } finally {
      this.running = false;
    }
  }

  async processSource(sourceId: string): Promise<void> {
    const sources = getActiveSources();
    const source = sources.find((s) => s.id === sourceId);

    if (!source) {
      this.logger.warn(`INGESTION_REJECTED — fonte desconhecida: ${sourceId}`);
      return;
    }

    this.logger.log(`INGESTION_START — ${source.id} (${source.type})`);

    const events = await this.gtfsAdapter.fetch(source);

    let accepted = 0;
    let rejected = 0;

    for (const event of events) {
      const result = await this.validator.validate(event);

      if (!result.valid) {
        this.logger.warn(
          `INGESTION_REJECTED — ${source.id} lineId:${event.lineId} motivo: ${result.reason}`,
        );
        rejected++;
        continue;
      }

      try {
        await this.networkStateService.upsert({
          lineId: event.lineId,
          status: event.status,
          delaySeconds: event.delaySeconds,
          message: event.message,
          sourceId: source.id,
          sourceType: NetworkStateSourceType.AI_ENGINE,
          reason: `Ingestao automatica via ${source.type}`,
        });
        accepted++;
      } catch (err) {
        this.logger.error(
          `INGESTION_ERROR — ${source.id} lineId:${event.lineId}: ${(err as Error).message}`,
        );
        rejected++;
      }
    }

    this.logger.log(
      `INGESTION_COMPLETE — ${source.id} aceitos:${accepted} rejeitados:${rejected} total:${events.length}`,
    );
  }

  onModuleDestroy(): void {
    this.running = false;
  }
}
