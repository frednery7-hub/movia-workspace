import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGeocodingClient } from './geocoding/google-geocoding.client';
import { GooglePlacesClient } from './places/google-places.client';
import { StationNearestService } from './station-nearest.service';

export type RawRouteDestination =
  | { type: 'station'; stationId: string }
  | { type: 'place'; placeId: string; label?: string; sessionToken?: string }
  | { type: 'address'; query: string; label?: string }
  | {
      type: 'coordinates';
      latitude: number;
      longitude: number;
      label?: string;
    };

export type NormalizedRouteDestination = {
  requestedDestination: {
    type: RawRouteDestination['type'];
    label: string;
    formattedAddress?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
  };
  routeDestinationStation: {
    id: string;
    name: string;
    lineIds: string[];
    distanceMeters?: number;
  };
};

@Injectable()
export class RouteDestinationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GoogleGeocodingClient,
    private readonly places: GooglePlacesClient,
    private readonly nearestStation: StationNearestService,
  ) {}

  async resolve(
    destination: RawRouteDestination,
  ): Promise<NormalizedRouteDestination> {
    if (destination.type === 'station') {
      const station = await this.prisma.station.findUnique({
        where: { id: destination.stationId },
        select: {
          id: true,
          name: true,
          platforms: {
            select: { lineId: true },
            orderBy: { lineId: 'asc' },
          },
        },
      });
      if (!station) {
        throw new NotFoundException('Estacao destino nao encontrada.');
      }

      return {
        requestedDestination: {
          type: 'station',
          label: station.name,
        },
        routeDestinationStation: {
          id: station.id,
          name: station.name,
          lineIds: [
            ...new Set(station.platforms.map((platform) => platform.lineId)),
          ],
          distanceMeters: 0,
        },
      };
    }

    if (destination.type === 'address') {
      const candidate = (
        await this.geocoding.searchAddress(destination.query)
      )[0];
      if (!candidate) {
        throw new NotFoundException('Endereco destino nao encontrado.');
      }

      const station = await this.nearestStation.findNearestStation({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      });

      return {
        requestedDestination: {
          type: 'address',
          label: destination.label ?? candidate.label,
          formattedAddress: candidate.formattedAddress,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
        },
        routeDestinationStation: station,
      };
    }

    if (destination.type === 'place') {
      const candidate = await this.places.getDetails(
        destination.placeId,
        destination.sessionToken,
      );
      if (!candidate) {
        throw new NotFoundException('Local destino nao encontrado.');
      }

      const station = await this.nearestStation.findNearestStation({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      });

      return {
        requestedDestination: {
          type: 'place',
          label: destination.label ?? candidate.name,
          formattedAddress: candidate.formattedAddress,
          placeId: candidate.placeId,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
        },
        routeDestinationStation: station,
      };
    }

    const station = await this.nearestStation.findNearestStation({
      latitude: destination.latitude,
      longitude: destination.longitude,
    });

    return {
      requestedDestination: {
        type: 'coordinates',
        label:
          destination.label ??
          `${destination.latitude},${destination.longitude}`,
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
      routeDestinationStation: station,
    };
  }
}
