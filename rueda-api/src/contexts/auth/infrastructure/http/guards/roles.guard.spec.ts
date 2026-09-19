import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../../../../../shared/domain/authenticated-user.js';
import { ForbiddenError } from '../../../../../shared/domain/errors/domain.error.js';
import { ROLES, type Role } from '../../../../../shared/domain/role.js';
import { IS_PUBLIC_KEY } from '../../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { ROLES_KEY } from '../../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

const EMPRESA_USER: AuthenticatedUser = {
  id: 1,
  role: ROLES.EMPRESA,
  eventId: null,
  companyEventIds: [100],
  companyUserIds: [10],
};

function buildGuard(metadata: { isPublic?: boolean; allowed?: Role[] }, user?: AuthenticatedUser) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === IS_PUBLIC_KEY) return metadata.isPublic ?? false;
    if (key === ROLES_KEY) return metadata.allowed;
    return undefined;
  });

  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as never;

  return { guard: new RolesGuard(reflector), context };
}

describe('RolesGuard', () => {
  it('lets a public route through', () => {
    const { guard, context } = buildGuard({ isPublic: true });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lets any authenticated caller through when no role is declared', () => {
    const { guard, context } = buildGuard({ allowed: undefined }, EMPRESA_USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('treats an empty role list as no restriction', () => {
    const { guard, context } = buildGuard({ allowed: [] }, EMPRESA_USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a caller holding one of the declared roles', () => {
    const { guard, context } = buildGuard({ allowed: [ROLES.ADMIN, ROLES.EMPRESA] }, EMPRESA_USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a caller whose role is not declared', () => {
    const { guard, context } = buildGuard({ allowed: [ROLES.ADMIN] }, EMPRESA_USER);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenError);
  });

  it('fails closed when the request carries no caller', () => {
    const { guard, context } = buildGuard({ allowed: [ROLES.ADMIN] }, undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenError);
  });
});
