import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MetroIncidentsController } from './metro-incidents.controller';
import { MetroIncidentsParser } from './metro-incidents.parser';
import { MetroIncidentsService } from './metro-incidents.service';
import { MetroScraperService } from './metro-scraper.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MetroIncidentsController],
  providers: [MetroScraperService, MetroIncidentsParser, MetroIncidentsService],
})
export class MetroIncidentsModule {}
