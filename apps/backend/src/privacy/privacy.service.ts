import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { maskId } from '../common/mask.util';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportData(deviceId: string) {
    this.logger.log(
      `PRIVACY_AUDIT export_requested device:${maskId(deviceId)}`,
    );

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
    this.logger.warn(
      `PRIVACY_AUDIT delete_requested device:${maskId(deviceId)}`,
    );

    await this.prisma.deviceSession.deleteMany({
      where: { deviceId },
    });

    this.logger.warn(
      `PRIVACY_AUDIT delete_completed device:${maskId(deviceId)}`,
    );

    return {
      deleted: true,
      message: 'Todos os dados associados ao dispositivo foram removidos.',
    };
  }

  async blockDevice(
    deviceId: string,
  ): Promise<{ blocked: boolean; message: string }> {
    this.logger.warn(
      `PRIVACY_AUDIT block_requested device:${maskId(deviceId)}`,
    );

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

    this.logger.warn(`PRIVACY_AUDIT block_applied device:${maskId(deviceId)}`);

    return {
      blocked: true,
      message:
        'Tratamento de dados suspenso conforme direito de bloqueio (Ley 21.719 Art. 11).',
    };
  }

  recordConsent(
    deviceId: string,
    consent: { version: string; locationUse: boolean; analytics?: boolean },
  ): { recorded: boolean; version: string } {
    this.logger.log(
      `PRIVACY_AUDIT consent_recorded device:${maskId(deviceId)} version:${consent.version} location:${consent.locationUse} analytics:${Boolean(consent.analytics)}`,
    );

    return {
      recorded: true,
      version: consent.version,
    };
  }

  revokeConsent(deviceId: string): { revoked: boolean; message: string } {
    this.logger.warn(
      `PRIVACY_AUDIT consent_revoked device:${maskId(deviceId)}`,
    );

    return {
      revoked: true,
      message: 'Consentimento de privacidade revogado localmente.',
    };
  }

  async unblockDevice(
    deviceId: string,
  ): Promise<{ blocked: boolean; message: string }> {
    this.logger.log(
      `PRIVACY_AUDIT unblock_requested device:${maskId(deviceId)}`,
    );

    await this.prisma.deviceSession.updateMany({
      where: { deviceId },
      data: { blocked: false },
    });

    return {
      blocked: false,
      message: 'Bloqueio removido. Tratamento de dados retomado.',
    };
  }

  async updateLanguage(
    deviceId: string,
    language: string,
  ): Promise<{ updated: boolean }> {
    this.logger.log(
      `PRIVACY_AUDIT language_update device:${maskId(deviceId)} lang:${language}`,
    );
    await this.prisma.deviceSession.updateMany({
      where: { deviceId, revoked: false, blocked: false },
      data: { language },
    });
    return { updated: true };
  }
}
