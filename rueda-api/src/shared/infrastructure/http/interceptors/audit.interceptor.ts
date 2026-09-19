import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  AUDIT_TRAIL_PORT,
  type AuditTrailPort,
} from '../../../application/ports/audit-trail.port.js';
import type { AuthenticatedUser } from '../../../domain/authenticated-user.js';
import { redactBody } from './redact.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Records every successful state change. Reads are not audited. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(AUDIT_TRAIL_PORT) private readonly audit: AuditTrailPort) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      originalUrl?: string;
      ip?: string;
      body?: Record<string, unknown>;
      user?: AuthenticatedUser;
    }>();

    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    return next.handle().pipe(
      tap({
        complete: () => {
          void this.audit.record({
            userId: request.user?.id ?? null,
            role: request.user?.role ?? 'PUBLICO',
            action: `${request.method} ${request.path}`,
            route: request.originalUrl ?? request.path,
            method: request.method,
            ip: request.ip ?? '',
            details: redactBody(request.body),
          });
        },
      }),
    );
  }
}
