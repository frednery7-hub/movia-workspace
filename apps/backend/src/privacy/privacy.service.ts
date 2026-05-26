import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { maskId } from '../common/mask.util';

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async exportData(deviceId: string) {
    const sessions = await this.prisma.deviceSession.findMany({
      where: { deviceId },
      select: {
        language: true,
        createdAt: true,
        expiresAt: true,
        revoked: true,
      },
    });

    return {
      deviceId: maskId(deviceId),
      exportedAt: new Date().toISOString(),
      dataTypes: [
        'device_identifier',
        'language_preference',
        'session_metadata',
      ],
      sessions,
      notice:
        'Coordenadas de localizacao nao sao persistidas conforme politica de minimizacao de dados.',
    };
  }

  async deleteData(
    deviceId: string,
  ): Promise<{ deleted: boolean; message: string }> {
    await this.prisma.deviceSession.deleteMany({
      where: { deviceId },
    });

    return {
      deleted: true,
      message: 'Todos os dados associados ao dispositivo foram removidos.',
    };
  }
}
