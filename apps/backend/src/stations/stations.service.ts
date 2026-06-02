import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: string) {
    return this.prisma.station.findMany({
      where: query
        ? { name: { contains: query, mode: 'insensitive' } }
        : undefined,
      select: {
        id: true,
        name: true,
        shortCode: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }
}
