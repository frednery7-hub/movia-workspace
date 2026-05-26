import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Limpeza automatica de sessoes expiradas — politica de retencao LGPD.
 * Roda na inicializacao e a cada 24h.
 */
@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.purgeExpiredSessions();
    // Agenda limpeza diaria
    setInterval(() => this.purgeExpiredSessions(), 24 * 60 * 60 * 1000);
  }

  async purgeExpiredSessions(): Promise<void> {
    try {
      const result = await this.prisma.deviceSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              revoked: true,
              updatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          ],
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Retencao: ${result.count} sessoes expiradas removidas.`,
        );
      }
    } catch (error) {
      this.logger.error('Erro na limpeza de sessoes:', error);
    }
  }
}
