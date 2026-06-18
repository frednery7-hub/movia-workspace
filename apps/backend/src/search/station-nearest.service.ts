import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  NearestStationInput,
  NearestStationResult,
} from './types/address-search.types';

export const MAX_RECOMMENDED_STATION_DISTANCE_METERS = 2_500;

/**
 * Valor inicial, ajustar conforme teste real. Margem aplicada sobre a
 * distancia da estacao mais proxima para preferir uma estacao na mesma
 * linha da origem, evitando baldeacao evitavel.
 */
export const SAME_LINE_PREFERENCE_MARGIN_METERS = 350;

export function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

@Injectable()
export class StationNearestService {
  constructor(private readonly prisma: PrismaService) {}

  async findNearestStation(
    input: NearestStationInput,
  ): Promise<NearestStationResult> {
    const stations = await this.prisma.station.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        platforms: {
          select: { lineId: true },
          orderBy: { lineId: 'asc' },
        },
      },
    });

    const candidates = stations
      .filter(
        (station) =>
          typeof station.latitude === 'number' &&
          typeof station.longitude === 'number',
      )
      .map((station) => ({
        id: station.id,
        name: station.name,
        lineIds: [
          ...new Set(station.platforms.map((platform) => platform.lineId)),
        ],
        distanceMeters: Math.round(
          haversineDistanceMeters(input, {
            latitude: station.latitude,
            longitude: station.longitude,
          }),
        ),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const nearest = candidates[0];
    if (!nearest) {
      throw new NotFoundException(
        'Nenhuma estação com coordenadas disponível.',
      );
    }

    if (input.originLineIds && input.originLineIds.length > 0) {
      const maxDistance =
        nearest.distanceMeters + SAME_LINE_PREFERENCE_MARGIN_METERS;
      const sameLineCandidate = candidates.find(
        (candidate) =>
          candidate.distanceMeters <= maxDistance &&
          candidate.lineIds.some((lineId) =>
            input.originLineIds!.includes(lineId),
          ),
      );
      if (sameLineCandidate) return sameLineCandidate;
    }

    return nearest;
  }
}
