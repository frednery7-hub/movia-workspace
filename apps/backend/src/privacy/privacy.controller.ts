import {
  Controller,
  Get,
  Delete,
  Post,
  Patch,
  Body,
  Request,
} from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

class UpdateLanguageDto {
  @IsString()
  @IsIn(['es-CL', 'pt-BR', 'en-US'])
  language!: string;
}

class ConsentDto {
  @IsString()
  version!: string;

  @IsBoolean()
  locationUse!: boolean;

  @IsOptional()
  @IsBoolean()
  analytics?: boolean;
}

interface JwtRequest {
  user: { sub: string; deviceId: string };
}

@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('export')
  async exportData(@Request() req: JwtRequest) {
    return this.privacyService.exportData(req.user.deviceId);
  }

  @Delete('data')
  async deleteData(@Request() req: JwtRequest) {
    return this.privacyService.deleteData(req.user.deviceId);
  }

  @Post('block')
  async blockDevice(@Request() req: JwtRequest) {
    return this.privacyService.blockDevice(req.user.deviceId);
  }

  @Post('consent')
  recordConsent(@Request() req: JwtRequest, @Body() dto: ConsentDto) {
    return this.privacyService.recordConsent(req.user.deviceId, dto);
  }

  @Delete('consent')
  revokeConsent(@Request() req: JwtRequest) {
    return this.privacyService.revokeConsent(req.user.deviceId);
  }

  @Delete('block')
  async unblockDevice(@Request() req: JwtRequest) {
    return this.privacyService.unblockDevice(req.user.deviceId);
  }

  @Patch('language')
  async updateLanguage(
    @Request() req: JwtRequest,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.privacyService.updateLanguage(req.user.deviceId, dto.language);
  }
}
