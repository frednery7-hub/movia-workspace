import { Injectable, NotFoundException } from '@nestjs/common';
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
        blocked: true,
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

  async blockDevice(
    deviceId: string,
  ): Promise<{ blocked: boolean; message: string }> {
    const sessions = await this.prisma.deviceSession.findMany({
      where: { deviceId, revoked: false },
    });

    if (sessions.length === 0) {
      throw new NotFoundException(
        'Nenhuma sessao ativa encontrada para este dispositivo.',
      );
    }

    await this.prisma.deviceSession.updateMany({
      where: { deviceId },
      data: { blocked: true },
    });

    return {
      blocked: true,
      message:
        'Tratamento de dados suspenso conforme direito de bloqueio (Ley 21.719 Art. 11).',
    };
  }

  async unblockDevice(
    deviceId: string,
  ): Promise<{ blocked: boolean; message: string }> {
    await this.prisma.deviceSession.updateMany({
      where: { deviceId },
      data: { blocked: false },
    });

    return {
      blocked: false,
      message: 'Bloqueio removido. Tratamento de dados retomado.',
    };
  }
}
