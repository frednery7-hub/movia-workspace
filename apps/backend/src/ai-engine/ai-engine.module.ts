import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AiEngineService } from './ai-engine.service';
import { DatasetBuilderService } from './dataset/dataset-builder.service';
import { FeatureBuilderService } from './features/feature-builder.service';
import { EwmaPredictorService } from './predictors/ewma-predictor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [
    AiEngineService,
    DatasetBuilderService,
    FeatureBuilderService,
    EwmaPredictorService,
  ],
  exports: [AiEngineService],
})
export class AiEngineModule {}
