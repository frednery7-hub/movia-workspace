import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  deviceSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('gera access_token e refresh_token', async () => {
      mockPrisma.deviceSession.create.mockResolvedValue({});
      const result = await service.generateToken(
        '550e8400-e29b-41d4-a716-446655440000',
        'es-CL',
      );
      expect(result.access_token).toBe('mock.jwt.token');
      expect(result.refresh_token).toBeDefined();
      expect(result.refresh_token.length).toBeGreaterThan(32);
      expect(result.expires_in).toBe(86400);
      expect(mockPrisma.deviceSession.create).toHaveBeenCalledTimes(1);
    });

    it('usa es-CL como idioma padrao', async () => {
      mockPrisma.deviceSession.create.mockResolvedValue({});
      await service.generateToken('550e8400-e29b-41d4-a716-446655440000');
      const [callArg] = mockPrisma.deviceSession.create.mock.calls[0] as [
        { data: { language: string } },
      ];

      expect(callArg.data.language).toBe('es-CL');
    });
  });

  describe('refreshSession', () => {
    it('lanca UnauthorizedException para token invalido', async () => {
      mockPrisma.deviceSession.findUnique.mockResolvedValue(null);
      await expect(service.refreshSession('invalid-token')).rejects.toThrow(
        'Refresh token invalido ou expirado.',
      );
    });

    it('lanca UnauthorizedException para sessao revogada', async () => {
      mockPrisma.deviceSession.findUnique.mockResolvedValue({
        id: '1',
        revoked: true,
        expiresAt: new Date(Date.now() + 10000),
      });
      await expect(service.refreshSession('revoked-token')).rejects.toThrow(
        'Refresh token invalido ou expirado.',
      );
    });

    it('lanca UnauthorizedException para sessao expirada', async () => {
      mockPrisma.deviceSession.findUnique.mockResolvedValue({
        id: '1',
        revoked: false,
        expiresAt: new Date(Date.now() - 10000),
      });
      await expect(service.refreshSession('expired-token')).rejects.toThrow(
        'Refresh token invalido ou expirado.',
      );
    });
  });

  describe('revokeSession', () => {
    it('revoga a sessao corretamente', async () => {
      mockPrisma.deviceSession.updateMany.mockResolvedValue({ count: 1 });
      await service.revokeSession('valid-refresh-token');
      expect(mockPrisma.deviceSession.updateMany).toHaveBeenCalledWith({
        where: { refreshToken: 'valid-refresh-token' },
        data: { revoked: true },
      });
    });
  });
});
