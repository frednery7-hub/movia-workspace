import { Controller, Post, Get, Body, Request, Delete } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { SessionTokens } from './auth.service';
import { Public } from './public.decorator';
import { CreateSessionDto } from './dto/session.dto';

interface JwtRequest {
  user: { sub: string; deviceId: string; language: string };
}

export class RefreshDto {
  refresh_token!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ session: { ttl: 60_000, limit: 5 } })
  @Post('session')
  async session(@Body() dto: CreateSessionDto): Promise<SessionTokens> {
    return this.authService.generateToken(dto.deviceId, dto.language);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<SessionTokens> {
    return this.authService.refreshSession(dto.refresh_token);
  }

  @Delete('session')
  async logout(@Body() dto: RefreshDto): Promise<{ message: string }> {
    await this.authService.revokeSession(dto.refresh_token);
    return { message: 'Sessao encerrada.' };
  }

  @Get('me')
  me(@Request() req: JwtRequest): { user: unknown } {
    return { user: req.user };
  }
}
