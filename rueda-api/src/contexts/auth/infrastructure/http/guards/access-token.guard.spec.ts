import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../../../../shared/domain/errors/domain.error.js';
import { ROLES, type Role } from '../../../../../shared/domain/role.js';
import { IS_PUBLIC_KEY } from '../../../../../shared/infrastructure/http/decorators/public.decorator.js';
import type { AccessTokenClaims, TokenSignerPort } from '../../../application/ports/token-signer.port.js';
import type {
  SessionRepositoryPort,
  SessionSnapshot,
} from '../../../domain/ports/session.repository.port.js';
import { AccessTokenGuard } from './access-token.guard.js';

const CLAIMS: AccessTokenClaims = {
  sub: 1,
  role: ROLES.EMPRESA,
  eventoId: null,
  eeIds: [100],
  euIds: [10],
};

const SNAPSHOT: SessionSnapshot = {
  id: 1,
  role: ROLES.EMPRESA,
  assignedEventId: null,
  grantedMemberships: [{ id: 10, companyEventId: 100 }],
};

function buildContext(headers: Record<string, string> = {}) {
  const request: { headers: Record<string, string>; user?: unknown } = { headers };
  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class {},
    } as never,
  };
}

function buildGuard(options: {
  isPublic?: boolean;
  claims?: AccessTokenClaims | Error;
  snapshot?: SessionSnapshot | null;
  principalEventId?: number | null;
}) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
    key === IS_PUBLIC_KEY ? (options.isPublic ?? false) : undefined,
  );

  const tokens: TokenSignerPort = {
    sign: async () => 'token',
    verify: async () => {
      const outcome = options.claims ?? CLAIMS;
      if (outcome instanceof Error) throw outcome;
      return outcome;
    },
  };

  const sessions: SessionRepositoryPort = {
    findActiveSession: async () => options.snapshot ?? null,
    findPrincipalEventId: async () => options.principalEventId ?? 100,
  };

  return new AccessTokenGuard(reflector, tokens, sessions);
}

describe('AccessTokenGuard', () => {
  it('lets a public route through without a token', async () => {
    const guard = buildGuard({ isPublic: true });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a request with no Authorization header', async () => {
    const guard = buildGuard({ snapshot: SNAPSHOT });
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedError('Se requiere una sesión válida.'),
    );
  });

  it('rejects a scheme that is not Bearer', async () => {
    const guard = buildGuard({ snapshot: SNAPSHOT });
    const { context } = buildContext({ authorization: 'Basic abc' });

    await expect(guard.canActivate(context)).rejects.toThrow(/sesión válida/);
  });

  it('rejects a token that fails verification', async () => {
    const guard = buildGuard({ claims: new Error('expired'), snapshot: SNAPSHOT });
    const { context } = buildContext({ authorization: 'Bearer abc' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedError('La sesión es inválida o expiró.'),
    );
  });

  it('rejects a token whose account no longer exists or was disabled', async () => {
    const guard = buildGuard({ snapshot: null });
    const { context } = buildContext({ authorization: 'Bearer abc' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedError('La cuenta ya no está habilitada.'),
    );
  });

  it('rejects a token whose role no longer matches the stored one', async () => {
    const guard = buildGuard({
      snapshot: { ...SNAPSHOT, role: ROLES.ADMIN as Role },
    });
    const { context } = buildContext({ authorization: 'Bearer abc' });

    await expect(guard.canActivate(context)).rejects.toThrow(/ya no está habilitada/);
  });

  it('attaches the caller rebuilt from the database, not from the token', async () => {
    const guard = buildGuard({
      claims: { ...CLAIMS, eeIds: [999], euIds: [999] },
      snapshot: SNAPSHOT,
    });
    const { context, request } = buildContext({ authorization: 'Bearer abc' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 1,
      role: ROLES.EMPRESA,
      eventId: null,
      companyEventIds: [100],
      companyUserIds: [10],
    });
  });

  it('resolves the event of global staff from the principal event', async () => {
    const guard = buildGuard({
      claims: { ...CLAIMS, role: ROLES.TECNICO },
      snapshot: { ...SNAPSHOT, role: ROLES.TECNICO, assignedEventId: 7, grantedMemberships: [] },
      principalEventId: 42,
    });
    const { context, request } = buildContext({ authorization: 'Bearer abc' });

    await guard.canActivate(context);

    expect((request.user as { eventId: number }).eventId).toBe(42);
  });

  it('keeps the stored event of an administrator', async () => {
    const guard = buildGuard({
      claims: { ...CLAIMS, role: ROLES.ADMIN },
      snapshot: { ...SNAPSHOT, role: ROLES.ADMIN, assignedEventId: 7, grantedMemberships: [] },
      principalEventId: 42,
    });
    const { context, request } = buildContext({ authorization: 'Bearer abc' });

    await guard.canActivate(context);

    expect((request.user as { eventId: number }).eventId).toBe(7);
  });
});
