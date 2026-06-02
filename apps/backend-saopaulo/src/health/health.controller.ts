import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  check(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('live')
  live(): { status: string } {
    return { status: 'alive' };
  }

  @Public()
  @Get('ready')
  async ready(): Promise<{ status: string; db: string; timestamp: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        db: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'not_ready',
        db: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
