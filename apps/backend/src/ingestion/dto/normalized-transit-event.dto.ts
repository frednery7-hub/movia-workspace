import { LineStatus } from '@prisma/client';

/**
 * Representação normalizada de um evento de trânsito.
 * Produzida pelo adapter após parsing da fonte externa.
 * Consumida pelo validator e depois pelo IngestionService.
 * Nunca contém dados brutos da fonte — sempre normalizado.
 */
export interface NormalizedTransitEvent {
  sourceId: string;
  lineId: string;
  status: LineStatus;
  delaySeconds: number;
  message?: string;
  observedAt: Date;
}
