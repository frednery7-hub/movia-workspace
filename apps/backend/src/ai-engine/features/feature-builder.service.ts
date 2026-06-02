import { Injectable } from '@nestjs/common';
import { DatasetEntry } from '../dataset/dataset-builder.service';

export interface FeatureVector {
  lineId: string;
  hourOfDay: number;
  dayOfWeek: number;
  currentDelaySeconds: number;
  avgDelaySeconds: number;
  maxDelaySeconds: number;
  incidentCount: number;
  degradationRatio: number;
}

@Injectable()
export class FeatureBuilderService {
  extract(lineId: string, entries: DatasetEntry[]): FeatureVector | null {
    if (entries.length === 0) return null;

    const delays = entries.map((e) => e.delaySeconds);
    const latest = entries[entries.length - 1];

    const avgDelay = delays.reduce((sum, d) => sum + d, 0) / delays.length;

    const maxDelay = Math.max(...delays);

    const incidentCount = entries.filter(
      (e) =>
        e.currentStatus === 'DELAYED' ||
        e.currentStatus === 'FAULTY' ||
        e.currentStatus === 'SUSPENDED',
    ).length;

    const degradationRatio = incidentCount / entries.length;

    return {
      lineId,
      hourOfDay: latest.hourOfDay,
      dayOfWeek: latest.dayOfWeek,
      currentDelaySeconds: latest.delaySeconds,
      avgDelaySeconds: Math.round(avgDelay),
      maxDelaySeconds: maxDelay,
      incidentCount,
      degradationRatio: Math.round(degradationRatio * 100) / 100,
    };
  }
}
