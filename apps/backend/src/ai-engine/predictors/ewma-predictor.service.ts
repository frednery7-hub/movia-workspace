import { Injectable, Logger } from '@nestjs/common';
import { FeatureVector } from '../features/feature-builder.service';
import { AiPrediction } from '../dto/prediction.dto';
import { LineStatus } from '@prisma/client';

// Fator de suavização EWMA — 0.3 prioriza histórico, 0.7 prioriza recente
const ALPHA = 0.3;

// Limites para classificação de status previsto
const DELAY_THRESHOLD_DELAYED = 120;
const DELAY_THRESHOLD_FAULTY = 600;

@Injectable()
export class EwmaPredictorService {
  private readonly logger = new Logger(EwmaPredictorService.name);
  private readonly ewmaState = new Map<string, number>();

  predict(features: FeatureVector): AiPrediction {
    const previous = this.ewmaState.get(features.lineId);

    const ewma =
      previous !== undefined
        ? ALPHA * features.currentDelaySeconds + (1 - ALPHA) * previous
        : features.avgDelaySeconds;

    this.ewmaState.set(features.lineId, ewma);

    const predictedDelay = Math.round(ewma);
    const predictedStatus = this.classifyDelay(predictedDelay);
    const confidence = this.computeConfidence(features);

    const prediction: AiPrediction = {
      lineId: features.lineId,
      predictedDelaySeconds: predictedDelay,
      predictedStatus,
      confidence,
      basedOn: {
        windowSizeEvents: features.incidentCount,
        hourOfDay: features.hourOfDay,
        dayOfWeek: features.dayOfWeek,
      },
      generatedAt: new Date(),
    };

    this.logger.log(
      `AI_PREDICTION_CREATED — lineId:${features.lineId} ` +
        `predictedDelay:${predictedDelay}s ` +
        `status:${predictedStatus} ` +
        `confidence:${confidence.toFixed(2)} ` +
        `basedOn:ewma alpha:${ALPHA} ` +
        `hora:${features.hourOfDay} dia:${features.dayOfWeek}`,
    );

    return prediction;
  }

  private classifyDelay(delaySeconds: number): LineStatus {
    if (delaySeconds >= DELAY_THRESHOLD_FAULTY) return LineStatus.FAULTY;
    if (delaySeconds >= DELAY_THRESHOLD_DELAYED) return LineStatus.DELAYED;
    return LineStatus.NORMAL;
  }

  private computeConfidence(features: FeatureVector): number {
    if (features.incidentCount === 0) return 0.3;
    if (features.incidentCount < 5) return 0.5;
    if (features.degradationRatio > 0.8) return 0.9;
    return Math.min(0.5 + features.incidentCount * 0.02, 0.95);
  }

  resetState(lineId?: string): void {
    if (lineId) {
      this.ewmaState.delete(lineId);
    } else {
      this.ewmaState.clear();
    }
  }
}
