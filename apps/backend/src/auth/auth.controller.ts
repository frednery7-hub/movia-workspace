import { Controller, Post, Get, Body, Request } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

export class SessionDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('session')
  session(@Body() dto: SessionDto): { access_token: string } {
    return this.authService.generateToken(dto.deviceId);
  }

  @Get('me')
  me(@Request() req: { user: unknown }): { user: unknown } {
    return { user: req.user };
  }
}
