import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { Role } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sem roles definidas — rota livre para qualquer autenticado
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: Role } | undefined;

    if (!user) throw new ForbiddenException('Sem identidade no request.');

    const userRole: Role = user.role ?? 'anonymous_device';

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Acesso negado. Role necessaria: ${requiredRoles.join(' | ')}`,
      );
    }

    return true;
  }
}
