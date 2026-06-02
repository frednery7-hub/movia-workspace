import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logger/winston.config';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';

@Global()
@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService, WinstonModule],
})
export class ObservabilityModule {}
