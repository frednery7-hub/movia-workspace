import { Controller, Post, Get, Body, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CreateSessionDto } from './dto/session.dto';

interface JwtRequest {
  user: { sub: string; deviceId: string; language: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('session')
  session(@Body() dto: CreateSessionDto): { access_token: string } {
    return this.authService.generateToken(dto.deviceId, dto.language);
  }

  @Get('me')
  me(@Request() req: JwtRequest): { user: unknown } {
    return { user: req.user };
  }
}
