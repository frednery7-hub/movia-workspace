import { Module } from '@nestjs/common';
import { NetworkStateService } from './network-state.service';
import { NetworkStateController } from './network-state.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NetworkStateController],
  providers: [NetworkStateService],
  exports: [NetworkStateService],
})
export class NetworkStateModule {}
