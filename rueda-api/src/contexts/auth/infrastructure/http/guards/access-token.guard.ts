import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../../../../../shared/domain/authenticated-user.js';
import { UnauthorizedError } from '../../../../../shared/domain/errors/domain.error.js';
import { TECNICO_ROLES } from '../../../../../shared/domain/role.js';
import { IS_PUBLIC_KEY } from '../../../../../shared/infrastructure/http/decorators/public.decorator.js';
import {
  TOKEN_SIGNER_PORT,
  type TokenSignerPort,
} from '../../../application/ports/token-signer.port.js';
import {
  SESSION_REPOSITORY,
  type SessionRepositoryPort,
  type SessionSnapshot,
} from '../../../domain/ports/session.repository.port.js';

const BEARER = 'Bearer ';

/**
 * Authenticates a request and rebuilds the caller from the database. The token
 * only identifies who is asking; every privilege is re-read, so disabling an
 * account or revoking an enrollment takes effect on the next request instead of
 * when the token expires.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SIGNER_PORT) private readonly tokens: TokenSignerPort,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthenticatedUser;
    }>();

    const header = request.headers?.authorization ?? '';
    if (!header.startsWith(BEARER)) throw new UnauthorizedError('Se requiere una sesión válida.');

    let claims;
    try {
      claims = await this.tokens.verify(header.slice(BEARER.length));
    } catch {
      throw new UnauthorizedError('La sesión es inválida o expiró.');
    }

    const session = await this.sessions.findActiveSession(claims.sub);
    if (!session || session.role !== claims.role) {
      throw new UnauthorizedError('La cuenta ya no está habilitada.');
    }

    request.user = {
      id: session.id,
      role: session.role,
      eventId: await this.resolveEventId(session),
      companyEventIds: session.grantedMemberships.map((item) => item.companyEventId),
      companyUserIds: session.grantedMemberships.map((item) => item.id),
    };

    return true;
  }

  /** Technical staff is global, so its event is always the principal one. */
  private async resolveEventId(session: SessionSnapshot): Promise<number | null> {
    if (!TECNICO_ROLES.includes(session.role)) return session.assignedEventId;
    return this.sessions.findPrincipalEventId();
  }
}
