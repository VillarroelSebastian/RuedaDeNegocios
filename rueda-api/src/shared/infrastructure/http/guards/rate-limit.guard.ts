import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import {
  ATTEMPT_LIMITER_PORT,
  type AttemptLimiterPort,
} from '../../../application/ports/attempt-limiter.port.js';
import { RateLimitedError } from '../../../domain/errors/domain.error.js';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../decorators/rate-limit.decorator.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ATTEMPT_LIMITER_PORT) private readonly limiter: AttemptLimiterPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<{
      ip?: string;
      path?: string;
      body?: Record<string, unknown>;
    }>();

    const key = digestOf(request);
    const attempts = await this.limiter.countRecentAttempts(key, options.windowMs);
    if (attempts >= options.attempts) {
      throw new RateLimitedError('Demasiados intentos. Intenta nuevamente en 15 minutos.');
    }

    await this.limiter.recordAttempt(key);
    return true;
  }
}

/**
 * The stored key is a digest: throttling state must not become a second copy of
 * the IP addresses and emails people submit.
 */
function digestOf(request: { ip?: string; path?: string; body?: Record<string, unknown> }): string {
  const submitted = request.body?.email;
  const email = typeof submitted === 'string' ? submitted.trim().toLowerCase() : '';
  const raw = `${request.ip ?? ''}:${request.path ?? ''}:${email}`;
  return createHash('sha256').update(raw).digest('hex');
}
