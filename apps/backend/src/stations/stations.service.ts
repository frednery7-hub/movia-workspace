import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: string) {
    const stations = await this.prisma.station.findMany({
      where: query
        ? { name: { contains: query, mode: 'insensitive' } }
        : undefined,
      select: {
        id: true,
        name: true,
        shortCode: true,
        latitude: true,
        longitude: true,
        platforms: {
          select: { lineId: true },
          orderBy: { lineId: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
      take: query ? 50 : undefined,
    });

    return stations.map(({ platforms, ...station }) => ({
      ...station,
      lines: [...new Set(platforms.map((platform) => platform.lineId))],
    }));
  }
}
