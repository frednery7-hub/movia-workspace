import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NetworkStateSourceType, LineStatus, Prisma } from '@prisma/client';

export interface UpsertNetworkStateInput {
  lineId: string;
  status: LineStatus;
  delaySeconds: number;
  message?: string | null;
  sourceId?: string;
  sourceType: NetworkStateSourceType;
  reason?: string;
}

export interface UpsertNetworkStateResult {
  noop: boolean;
  lineId: string;
  status: LineStatus;
  delaySeconds: number;
}

@Injectable()
export class NetworkStateService {
  private readonly logger = new Logger(NetworkStateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    input: UpsertNetworkStateInput,
  ): Promise<UpsertNetworkStateResult> {
    const {
      lineId,
      status,
      delaySeconds,
      message,
      sourceId,
      sourceType,
      reason,
    } = input;

    const line = await this.prisma.line.findUnique({ where: { id: lineId } });
    if (!line) {
      throw new NotFoundException(`Linha nao encontrada: ${lineId}`);
    }

    const current = await this.prisma.networkState.findUnique({
      where: { lineId },
    });

    // ── Idempotência: sem mudança real, sem evento ────────────────
    const isSameStatus = current?.status === status;
    const isSameDelay = current?.delaySeconds === delaySeconds;
    const isSameMessage = (current?.message ?? null) === (message ?? null);

    if (current && isSameStatus && isSameDelay && isSameMessage) {
      this.logger.log(
        `NETWORK_STATE_NOOP — lineId: ${lineId} status: ${status} (sem mudanca)`,
      );
      return { noop: true, lineId, status, delaySeconds };
    }

    // ── Transação: upsert estado atual + insert evento ────────────
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.networkState.upsert({
        where: { lineId },
        create: {
          lineId,
          status,
          delaySeconds,
          message: message ?? null,
          sourceId: sourceId ?? null,
          sourceType,
        },
        update: {
          status,
          delaySeconds,
          message: message ?? null,
          sourceId: sourceId ?? null,
          sourceType,
        },
      });

      await tx.networkStateEvent.create({
        data: {
          lineId,
          oldStatus: current?.status ?? null,
          newStatus: status,
          oldDelaySeconds: current?.delaySeconds ?? null,
          newDelaySeconds: delaySeconds,
          oldMessage: current?.message ?? null,
          newMessage: message ?? null,
          sourceId: sourceId ?? null,
          sourceType,
          reason: reason ?? null,
        },
      });
    });

    this.logger.log(
      `NETWORK_STATE_UPDATE — lineId: ${lineId} ${current?.status ?? 'NEW'} → ${status} delay: ${delaySeconds}s source: ${sourceType}/${sourceId ?? 'system'}`,
    );

    return { noop: false, lineId, status, delaySeconds };
  }

  async getByLineId(lineId: string) {
    return this.prisma.networkState.findUnique({ where: { lineId } });
  }

  async getAll() {
    return this.prisma.networkState.findMany();
  }

  async getHistory(lineId: string, limit = 50) {
    return this.prisma.networkStateEvent.findMany({
      where: { lineId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
