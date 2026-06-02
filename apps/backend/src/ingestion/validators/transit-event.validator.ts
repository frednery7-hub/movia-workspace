import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NormalizedTransitEvent } from '../dto/normalized-transit-event.dto';
import { LineStatus } from '@prisma/client';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const VALID_STATUSES = new Set<LineStatus>([
  LineStatus.NORMAL,
  LineStatus.DELAYED,
  LineStatus.FAULTY,
  LineStatus.SUSPENDED,
]);

const MAX_DELAY_SECONDS = 86400;
const MAX_MESSAGE_LENGTH = 500;
const MAX_EVENT_AGE_SECONDS = 300;

@Injectable()
export class TransitEventValidator {
  private readonly logger = new Logger(TransitEventValidator.name);
  private readonly lineCache = new Set<string>();
  private cacheLoadedAt: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async validate(event: NormalizedTransitEvent): Promise<ValidationResult> {
    // ── Campos obrigatórios ───────────────────────────────────────
    if (!event.lineId || !event.lineId.trim()) {
      return this.reject('lineId ausente ou vazio');
    }
    if (!event.sourceId || !event.sourceId.trim()) {
      return this.reject('sourceId ausente ou vazio');
    }

    // ── Status válido ─────────────────────────────────────────────
    if (!VALID_STATUSES.has(event.status)) {
      return this.reject(`status invalido: ${event.status}`);
    }

    // ── Delay não negativo e dentro do limite ─────────────────────
    if (event.delaySeconds < 0) {
      return this.reject(`delaySeconds negativo: ${event.delaySeconds}`);
    }
    if (event.delaySeconds > MAX_DELAY_SECONDS) {
      return this.reject(`delaySeconds absurdo: ${event.delaySeconds}`);
    }

    // ── Mensagem dentro do limite ─────────────────────────────────
    if (event.message && event.message.length > MAX_MESSAGE_LENGTH) {
      return this.reject(`message excede ${MAX_MESSAGE_LENGTH} caracteres`);
    }

    // ── Timestamp válido e recente ────────────────────────────────
    if (!event.observedAt || isNaN(event.observedAt.getTime())) {
      return this.reject('observedAt invalido');
    }
    const ageSeconds = (Date.now() - event.observedAt.getTime()) / 1000;
    if (ageSeconds > MAX_EVENT_AGE_SECONDS) {
      return this.reject(
        `evento muito antigo: ${Math.round(ageSeconds)}s (max ${MAX_EVENT_AGE_SECONDS}s)`,
      );
    }

    // ── Linha existe no banco (com cache) ─────────────────────────
    const lineExists = await this.lineExistsInCache(event.lineId);
    if (!lineExists) {
      return this.reject(`linha nao encontrada no banco: ${event.lineId}`);
    }

    return { valid: true };
  }

  private async lineExistsInCache(lineId: string): Promise<boolean> {
    const cacheAgeMs = this.cacheLoadedAt
      ? Date.now() - this.cacheLoadedAt.getTime()
      : Infinity;

    if (cacheAgeMs > 5 * 60 * 1000) {
      const lines = await this.prisma.line.findMany({
        select: { id: true },
      });
      this.lineCache.clear();
      lines.forEach((l) => this.lineCache.add(l.id));
      this.cacheLoadedAt = new Date();
      this.logger.log(
        `LINE_CACHE_REFRESHED — ${this.lineCache.size} linhas carregadas`,
      );
    }

    return this.lineCache.has(lineId);
  }

  private reject(reason: string): ValidationResult {
    return { valid: false, reason };
  }
}
