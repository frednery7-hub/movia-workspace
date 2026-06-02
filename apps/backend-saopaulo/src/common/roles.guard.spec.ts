import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

function mockContext(role?: string): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite acesso quando nao ha roles definidas', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext('anonymous_device'))).toBe(true);
  });

  it('permite acesso para role correta', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['operator']);
    expect(guard.canActivate(mockContext('operator'))).toBe(true);
  });

  it('permite acesso para admin em rota de operator', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['operator', 'admin']);
    expect(guard.canActivate(mockContext('admin'))).toBe(true);
  });

  it('bloqueia anonymous_device em rota de operator', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['operator']);
    expect(() => guard.canActivate(mockContext('anonymous_device'))).toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia user em rota de admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(() => guard.canActivate(mockContext('user'))).toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia request sem user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['operator']);
    expect(() => guard.canActivate(mockContext())).toThrow(ForbiddenException);
  });
});
