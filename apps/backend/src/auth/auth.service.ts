import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(
    deviceId: string,
    language = 'es-CL',
  ): { access_token: string } {
    const payload: JwtPayload = {
      sub: deviceId,
      deviceId: deviceId,
      language,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
