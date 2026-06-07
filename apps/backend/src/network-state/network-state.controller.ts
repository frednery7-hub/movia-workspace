import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { NetworkStateService } from './network-state.service';
import { UpdateNetworkStateDto } from './dto/update-network-state.dto';
import { Roles } from '../common/roles.decorator';
import { NetworkStateSourceType } from '@prisma/client';

interface JwtRequest {
  user: { sub: string; role: string };
}

const LINE_ID_REGEX = /^L[0-9A-Z]+$/;

@Controller('network-state')
export class NetworkStateController {
  constructor(private readonly networkStateService: NetworkStateService) {}

  @Roles('operator', 'admin')
  @Put(':lineId')
  async update(
    @Param('lineId') lineId: string,
    @Body() dto: UpdateNetworkStateDto,
    @Request() req: JwtRequest,
  ) {
    if (!LINE_ID_REGEX.test(lineId)) {
      throw new BadRequestException('lineId invalido.');
    }

    const sourceType = this.resolveSourceType(req.user.role);

    return this.networkStateService.upsert({
      lineId,
      status: dto.status,
      delaySeconds: dto.delaySeconds,
      message: dto.message,
      sourceId: req.user.sub,
      sourceType,
      reason: dto.reason,
    });
  }

  @Get(':lineId')
  async getByLine(@Param('lineId') lineId: string) {
    return this.networkStateService.getByLineId(lineId);
  }

  @Get()
  async getAll() {
    return this.networkStateService.getAll();
  }

  @Roles('operator', 'admin')
  @Get(':lineId/history')
  async getHistory(
    @Param('lineId') lineId: string,
    @Query('limit') limit?: string,
  ) {
    return this.networkStateService.getHistory(
      lineId,
      limit ? Math.min(parseInt(limit, 10), 100) : 50,
    );
  }

  private resolveSourceType(role: string): NetworkStateSourceType {
    switch (role) {
      case 'admin':
        return NetworkStateSourceType.ADMIN;
      case 'ai_engine':
        return NetworkStateSourceType.AI_ENGINE;
      default:
        return NetworkStateSourceType.OPERATOR;
    }
  }
}
