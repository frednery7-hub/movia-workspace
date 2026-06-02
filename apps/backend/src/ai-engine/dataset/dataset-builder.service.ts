import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LineStatus } from '@prisma/client';

export interface DatasetEntry {
  lineId: string;
  previousStatus: LineStatus | null;
  currentStatus: LineStatus;
  delaySeconds: number;
  timestamp: Date;
  hourOfDay: number;
  dayOfWeek: number;
}

const DEFAULT_WINDOW_HOURS = 24;

@Injectable()
export class DatasetBuilderService {
  private readonly logger = new Logger(DatasetBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lê NetworkStateEvent do banco e constrói o dataset histórico.
   * Read-only — nunca escreve no banco.
   */
  async build(
    lineId: string,
    windowHours = DEFAULT_WINDOW_HOURS,
  ): Promise<DatasetEntry[]> {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const events = await this.prisma.networkStateEvent.findMany({
      where: {
        lineId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (events.length === 0) {
      this.logger.debug(
        `DATASET_EMPTY — lineId:${lineId} janela:${windowHours}h`,
      );
      return [];
    }

    const dataset: DatasetEntry[] = events.map((e) => ({
      lineId: e.lineId,
      previousStatus: e.oldStatus,
      currentStatus: e.newStatus,
      delaySeconds: e.newDelaySeconds,
      timestamp: e.createdAt,
      hourOfDay: e.createdAt.getHours(),
      dayOfWeek: e.createdAt.getDay(),
    }));

    this.logger.log(
      `DATASET_BUILT — lineId:${lineId} eventos:${dataset.length} janela:${windowHours}h`,
    );

    return dataset;
  }

  async buildForAllLines(
    windowHours = DEFAULT_WINDOW_HOURS,
  ): Promise<Map<string, DatasetEntry[]>> {
    const lines = await this.prisma.line.findMany({
      select: { id: true },
    });

    const result = new Map<string, DatasetEntry[]>();

    for (const line of lines) {
      const entries = await this.build(line.id, windowHours);
      if (entries.length > 0) {
        result.set(line.id, entries);
      }
    }

    this.logger.log(
      `DATASET_BUILT_ALL — ${result.size} linhas com dados nas ultimas ${windowHours}h`,
    );

    return result;
  }
}
