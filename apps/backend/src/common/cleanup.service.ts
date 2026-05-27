import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);
  private intervalHandle?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    void this.purgeExpiredSessions();
    this.intervalHandle = setInterval(
      () => {
        void this.purgeExpiredSessions();
      },
      24 * 60 * 60 * 1000,
    );
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
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
