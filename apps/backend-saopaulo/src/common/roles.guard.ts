import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';
import type { Role } from './roles.decorator';

interface AuthenticatedRequest extends Request {
  user?: { role?: Role };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

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
