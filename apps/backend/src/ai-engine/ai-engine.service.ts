import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatasetBuilderService } from './dataset/dataset-builder.service';
import { FeatureBuilderService } from './features/feature-builder.service';
import { EwmaPredictorService } from './predictors/ewma-predictor.service';
import { AiPrediction } from './dto/prediction.dto';
import { MetricsService } from '../observability/metrics/metrics.service';

@Injectable()
export class AiEngineService {
  private readonly logger = new Logger(AiEngineService.name);
  private readonly predictions = new Map<string, AiPrediction>();
  private running = false;

  constructor(
    private readonly datasetBuilder: DatasetBuilderService,
    private readonly featureBuilder: FeatureBuilderService,
    private readonly predictor: EwmaPredictorService,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runPredictionCycle(): Promise<void> {
    if (this.running) {
      this.logger.warn('AI_CYCLE_SKIPPED — ciclo anterior ainda em execucao');
      return;
    }

    this.running = true;
    const startMs = Date.now();
    this.metrics.aiCyclesTotal.inc();

    try {
      const datasets = await this.datasetBuilder.buildForAllLines();

      if (datasets.size === 0) {
        this.metrics.aiDatasetEmptyTotal.inc();
        this.logger.debug('AI_CYCLE_NOOP — sem dados historicos disponiveis');
        return;
      }

      let predicted = 0;

      for (const [lineId, entries] of datasets) {
        const features = this.featureBuilder.extract(lineId, entries);
        if (!features) continue;

        const prediction = this.predictor.predict(features);
        this.predictions.set(lineId, prediction);
        this.metrics.aiPredictionsTotal.inc();
        predicted++;
      }

      this.metrics.aiCycleDurationMs.observe(Date.now() - startMs);
      this.logger.log(
        `AI_CYCLE_COMPLETE — ${predicted} previsao(es) gerada(s)`,
      );
    } catch (err) {
      this.logger.error(`AI_CYCLE_ERROR — ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  getPrediction(lineId: string): AiPrediction | null {
    return this.predictions.get(lineId) ?? null;
  }

  getAllPredictions(): AiPrediction[] {
    return [...this.predictions.values()];
  }
}
