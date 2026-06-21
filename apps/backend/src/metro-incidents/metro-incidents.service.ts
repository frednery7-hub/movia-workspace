import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetroScraperService } from './metro-scraper.service';
import { MetroIncidentsParser } from './metro-incidents.parser';
import {
  METRO_INCIDENTS_SOURCE,
  METRO_INCIDENTS_SOURCE_URL,
  METRO_LINE_IDS,
  MetroIncident,
  MetroIncidentsResponse,
} from './metro-incidents.types';

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Hibernado em 2026-06-21: o scraper busca de datosdechile.cl (terceiro),
 * nao do metro.cl oficial, mas o app exibia "Fonte oficial: Metro de
 * Santiago". Desligado ate decidirmos buscar do metro.cl de verdade ou
 * rotular a fonte real com honestidade. Reativar trocando para true
 * apos resolver a divergencia de fonte.
 */
const METRO_INCIDENTS_ENABLED = process.env.METRO_INCIDENTS_ENABLED === 'true';

@Injectable()
export class MetroIncidentsService implements OnModuleInit {
  private readonly logger = new Logger(MetroIncidentsService.name);
  private cache: MetroIncidentsResponse | null = null;
  private lastValid: MetroIncidentsResponse | null = null;
  private refreshPromise: Promise<MetroIncidentsResponse> | null = null;

  constructor(
    private readonly scraper: MetroScraperService,
    private readonly parser: MetroIncidentsParser,
  ) {}

  onModuleInit(): void {
    if (!METRO_INCIDENTS_ENABLED) {
      this.logger.log('METRO_INCIDENTS_HIBERNATED — scraper nao iniciado.');
      return;
    }
    this.refresh().catch((error: Error) => {
      this.logger.warn(`METRO_INCIDENTS_BOOTSTRAP_FAILED — ${error.message}`);
    });
  }

  async getIncidents(): Promise<MetroIncidentsResponse> {
    if (!METRO_INCIDENTS_ENABLED) {
      return this.buildHibernatedResponse();
    }
    if (this.cache && !this.isExpired(this.cache.updatedAt)) {
      return this.cache;
    }

    try {
      return await this.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`METRO_INCIDENTS_REFRESH_FAILED — ${message}`);

      if (this.lastValid) return { ...this.lastValid, stale: true };
      return this.buildUnknownResponse();
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshScheduled(): Promise<void> {
    if (!METRO_INCIDENTS_ENABLED) return;
    await this.refresh().catch((error: Error) => {
      this.logger.warn(`METRO_INCIDENTS_CRON_FAILED — ${error.message}`);
    });
  }

  private buildHibernatedResponse(): MetroIncidentsResponse {
    return this.buildResponse([], new Date().toISOString());
  }

  private async refresh(): Promise<MetroIncidentsResponse> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.scrapeAndParse().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async scrapeAndParse(): Promise<MetroIncidentsResponse> {
    const html = await this.scraper.fetchStatusHtml();
    const now = new Date();
    const incidents = this.parser.parse(html, now);
    const response = this.buildResponse(incidents, now.toISOString());

    this.cache = response;
    this.lastValid = response;
    return response;
  }

  private buildResponse(
    incidents: MetroIncident[],
    updatedAt: string,
  ): MetroIncidentsResponse {
    return {
      updatedAt,
      source: METRO_INCIDENTS_SOURCE,
      sourceUrl: METRO_INCIDENTS_SOURCE_URL,
      incidents,
    };
  }

  private buildUnknownResponse(): MetroIncidentsResponse {
    const now = new Date().toISOString();
    return this.buildResponse(
      METRO_LINE_IDS.map((lineId) => ({
        id: `${lineId}-unknown-${now.slice(0, 10).replace(/-/g, '')}`,
        lineId,
        status: 'unknown',
        title: 'No fue posible verificar el estado',
        description: 'Consulte metro.cl para información actualizada.',
        source: METRO_INCIDENTS_SOURCE,
        scrapedAt: now,
        updatedAt: now,
      })),
      now,
    );
  }

  private isExpired(updatedAt: string): boolean {
    return Date.now() - new Date(updatedAt).getTime() > CACHE_TTL_MS;
  }
}
