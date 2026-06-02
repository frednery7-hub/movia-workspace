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
import { IsString, IsIn } from 'class-validator';

class UpdateLanguageDto {
  @IsString()
  @IsIn(['es-CL', 'pt-BR', 'en-US'])
  language!: string;
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
