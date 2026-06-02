import { Injectable, Logger } from '@nestjs/common';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { NormalizedTransitEvent } from '../dto/normalized-transit-event.dto';
import { IngestionSource } from '../source-registry';
import { LineStatus } from '@prisma/client';

@Injectable()
export class GtfsAdapter {
  private readonly logger = new Logger(GtfsAdapter.name);

  async fetch(source: IngestionSource): Promise<NormalizedTransitEvent[]> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      source.timeoutSeconds * 1000,
    );

    let buffer: ArrayBuffer;

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Movia-Ingestion/1.0' },
      });

      if (!response.ok) {
        this.logger.warn(
          `SOURCE_UNAVAILABLE — ${source.id} HTTP ${response.status}`,
        );
        return [];
      }

      buffer = await response.arrayBuffer();
    } catch (err) {
      this.logger.warn(
        `SOURCE_UNAVAILABLE — ${source.id} fetch falhou: ${(err as Error).message}`,
      );
      return [];
    } finally {
      clearTimeout(timeout);
    }

    return this.parse(source, buffer);
  }

  private parse(
    source: IngestionSource,
    buffer: ArrayBuffer,
  ): NormalizedTransitEvent[] {
    let feed: transit_realtime.FeedMessage;

    try {
      feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    } catch (err) {
      this.logger.error(
        `GTFS_PARSE_ERROR — ${source.id}: ${(err as Error).message}`,
      );
      return [];
    }

    const events: NormalizedTransitEvent[] = [];
    const observedAt = new Date();

    for (const entity of feed.entity ?? []) {
      const alert = entity.alert;
      if (!alert) continue;

      const status = this.mapCauseToStatus(alert.cause);
      const lineIds = this.extractLineIds(alert);

      for (const lineId of lineIds) {
        events.push({
          sourceId: source.id,
          lineId,
          status,
          delaySeconds: this.extractDelay(alert),
          message: this.extractMessage(alert),
          observedAt,
        });
      }
    }

    this.logger.log(
      `GTFS_PARSED — ${source.id}: ${events.length} evento(s) extraido(s)`,
    );

    return events;
  }

  private mapCauseToStatus(
    cause?: transit_realtime.Alert.Cause | null,
  ): LineStatus {
    switch (cause) {
      case transit_realtime.Alert.Cause.TECHNICAL_PROBLEM:
      case transit_realtime.Alert.Cause.ACCIDENT:
        return LineStatus.FAULTY;
      case transit_realtime.Alert.Cause.STRIKE:
      case transit_realtime.Alert.Cause.DEMONSTRATION:
        return LineStatus.SUSPENDED;
      case transit_realtime.Alert.Cause.MAINTENANCE:
      case transit_realtime.Alert.Cause.CONSTRUCTION:
        return LineStatus.DELAYED;
      default:
        return LineStatus.DELAYED;
    }
  }

  private extractLineIds(alert: transit_realtime.IAlert): string[] {
    const ids: string[] = [];
    for (const selector of alert.informedEntity ?? []) {
      if (selector.routeId) {
        ids.push(selector.routeId);
      }
    }
    return ids;
  }

  private extractDelay(alert: transit_realtime.IAlert): number {
    const desc = alert.descriptionText?.translation?.[0]?.text ?? '';
    const match = desc.match(/(\d+)\s*(min|minute|minuto)/i);
    if (match) return parseInt(match[1], 10) * 60;
    return 0;
  }

  private extractMessage(alert: transit_realtime.IAlert): string | undefined {
    return alert.headerText?.translation?.[0]?.text?.slice(0, 500) ?? undefined;
  }
}
