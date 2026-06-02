import { Module } from '@nestjs/common';
import { EtaService } from './eta.service';
import { EtaController } from './eta.controller';
import { GraphModule } from '../graph/graph.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiEngineModule } from '../ai-engine/ai-engine.module';

@Module({
  imports: [PrismaModule, GraphModule, AiEngineModule],
  controllers: [EtaController],
  providers: [EtaService],
})
export class EtaModule {}
