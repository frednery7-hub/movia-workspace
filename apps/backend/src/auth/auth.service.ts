import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { maskId } from '../common/mask.util';
import type { JwtPayload } from './jwt.strategy';
import type { Role } from '../common/roles.decorator';
import * as crypto from 'crypto';

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async generateToken(
    deviceId: string,
    language = 'es-CL',
    role: Role = 'anonymous_device',
    ipAddress?: string,
  ): Promise<SessionTokens> {
    const payload: JwtPayload = { sub: deviceId, deviceId, language, role };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.deviceSession.create({
      data: {
        deviceId,
        refreshToken: refresh_token,
        language,
        ipAddress,
        expiresAt,
      },
    });

    return { access_token, refresh_token, expires_in: 86_400 };
  }

  async refreshSession(refreshToken: string): Promise<SessionTokens> {
    const session = await this.prisma.deviceSession.findUnique({
      where: { refreshToken },
    });

    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalido ou expirado.');
    }

    await this.prisma.deviceSession.update({
      where: { id: session.id },
      data: { revoked: true },
    });

    return this.generateToken(session.deviceId, session.language);
  }

  async revokeSession(refreshToken: string): Promise<void> {
    await this.prisma.deviceSession.updateMany({
      where: { refreshToken },
      data: { revoked: true },
    });
  }
}
