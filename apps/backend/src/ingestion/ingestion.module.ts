import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestionService } from './ingestion.service';
import { GtfsAdapter } from './adapters/gtfs.adapter';
import { TransitEventValidator } from './validators/transit-event.validator';
import { PrismaModule } from '../prisma/prisma.module';
import { NetworkStateModule } from '../network-state/network-state.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, NetworkStateModule],
  providers: [IngestionService, GtfsAdapter, TransitEventValidator],
  exports: [IngestionService],
})
export class IngestionModule {}
