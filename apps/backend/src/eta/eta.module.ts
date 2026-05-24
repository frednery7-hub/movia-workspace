import { Module } from '@nestjs/common';
import { EtaService } from './eta.service';
import { EtaController } from './eta.controller';

@Module({
  controllers: [EtaController],
  providers: [EtaService],
  exports: [EtaService],
})
export class EtaModule {}
