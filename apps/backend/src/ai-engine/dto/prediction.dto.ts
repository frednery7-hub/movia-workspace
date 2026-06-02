import { LineStatus } from '@prisma/client';

export interface AiPrediction {
  lineId: string;
  predictedDelaySeconds: number;
  predictedStatus: LineStatus;
  confidence: number;
  basedOn: {
    windowSizeEvents: number;
    hourOfDay: number;
    dayOfWeek: number;
  };
  generatedAt: Date;
}
