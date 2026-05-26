import { Controller, Get, Delete, Request } from '@nestjs/common';
import { PrivacyService } from './privacy.service';

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
}
