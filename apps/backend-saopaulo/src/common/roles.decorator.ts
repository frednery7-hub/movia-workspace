import { SetMetadata } from '@nestjs/common';

export type Role = 'anonymous_device' | 'user' | 'operator' | 'admin';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
