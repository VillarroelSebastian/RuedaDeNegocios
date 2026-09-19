import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../../../../../shared/domain/authenticated-user.js';
import { ForbiddenError } from '../../../../../shared/domain/errors/domain.error.js';
import type { Role } from '../../../../../shared/domain/role.js';
import { IS_PUBLIC_KEY } from '../../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { ROLES_KEY } from '../../../../../shared/infrastructure/http/decorators/roles.decorator.js';

/** Enforces `@Roles(...)`. Runs after `AccessTokenGuard` has resolved the caller. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // No `@Roles` means any authenticated caller is welcome.
    if (!allowed?.length) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user || !allowed.includes(user.role)) {
      throw new ForbiddenError('No tienes permiso para realizar esta acción.');
    }

    return true;
  }
}
