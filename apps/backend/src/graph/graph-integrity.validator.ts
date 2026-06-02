import { Logger } from '@nestjs/common';

const logger = new Logger('GraphIntegrityValidator');

interface RawSegment {
  id: string;
  fromPlatformId: string;
  toPlatformId: string;
  lineId: string;
  averageDurationSeconds: number;
  distanceMeters: number;
  sequence: number;
}

interface RawPlatform {
  id: string;
  stationId: string;
  lineId: string;
}

interface RawStation {
  id: string;
  latitude: number;
  longitude: number;
}

interface RawTransfer {
  id: string;
  fromPlatformId: string;
  toPlatformId: string;
  walkingSeconds: number;
}

export function validateGraphData(params: {
  stations: RawStation[];
  platforms: RawPlatform[];
  segments: RawSegment[];
  transfers: RawTransfer[];
}): void {
  const { stations, platforms, segments, transfers } = params;
  const errors: string[] = [];

  const stationIds = new Set(stations.map((s) => s.id));
  const platformIds = new Set(platforms.map((p) => p.id));

  // ── Estações ─────────────────────────────────────────────────
  for (const station of stations) {
    if (station.latitude < -90 || station.latitude > 90) {
      errors.push(
        `Station ${station.id}: latitude invalida (${station.latitude})`,
      );
    }
    if (station.longitude < -180 || station.longitude > 180) {
      errors.push(
        `Station ${station.id}: longitude invalida (${station.longitude})`,
      );
    }
  }

  // ── Plataformas ───────────────────────────────────────────────
  for (const platform of platforms) {
    if (!stationIds.has(platform.stationId)) {
      errors.push(
        `Platform ${platform.id}: stationId orfao (${platform.stationId})`,
      );
    }
  }

  // ── Segmentos ─────────────────────────────────────────────────
  for (const seg of segments) {
    if (seg.averageDurationSeconds <= 0) {
      errors.push(
        `Segment ${seg.id}: averageDurationSeconds invalido (${seg.averageDurationSeconds})`,
      );
    }
    if (seg.distanceMeters < 0) {
      errors.push(
        `Segment ${seg.id}: distanceMeters invalido (${seg.distanceMeters})`,
      );
    }
    if (seg.sequence < 0) {
      errors.push(`Segment ${seg.id}: sequence invalido (${seg.sequence})`);
    }
    if (!platformIds.has(seg.fromPlatformId)) {
      errors.push(
        `Segment ${seg.id}: fromPlatformId orfao (${seg.fromPlatformId})`,
      );
    }
    if (!platformIds.has(seg.toPlatformId)) {
      errors.push(
        `Segment ${seg.id}: toPlatformId orfao (${seg.toPlatformId})`,
      );
    }
    if (seg.fromPlatformId === seg.toPlatformId) {
      errors.push(`Segment ${seg.id}: loop invalido (from === to)`);
    }
  }

  // ── Transferencias ────────────────────────────────────────────
  for (const transfer of transfers) {
    if (transfer.walkingSeconds < 0) {
      errors.push(
        `Transfer ${transfer.id}: walkingSeconds invalido (${transfer.walkingSeconds})`,
      );
    }
    if (!platformIds.has(transfer.fromPlatformId)) {
      errors.push(
        `Transfer ${transfer.id}: fromPlatformId orfao (${transfer.fromPlatformId})`,
      );
    }
    if (!platformIds.has(transfer.toPlatformId)) {
      errors.push(
        `Transfer ${transfer.id}: toPlatformId orfao (${transfer.toPlatformId})`,
      );
    }
  }

  if (errors.length > 0) {
    logger.error(
      `GRAPH_INTEGRITY_FAIL — ${errors.length} violacao(s) encontrada(s):\n${errors.map((e) => `  • ${e}`).join('\n')}`,
    );
    throw new Error(
      `GraphIntegrityValidator: build abortado com ${errors.length} violacao(s). Verifique os logs.`,
    );
  }

  logger.log(
    `GRAPH_INTEGRITY_OK — ${stations.length} estacoes, ${platforms.length} plataformas, ${segments.length} segmentos, ${transfers.length} transferencias validados.`,
  );
}
