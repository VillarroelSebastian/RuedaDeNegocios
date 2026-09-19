import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AttemptLimiterPort } from '../../../application/ports/attempt-limiter.port.js';
import { RateLimitedError } from '../../../domain/errors/domain.error.js';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from '../decorators/rate-limit.decorator.js';
import { RateLimitGuard } from './rate-limit.guard.js';

class FakeAttemptLimiter implements AttemptLimiterPort {
  readonly recorded: string[] = [];

  constructor(private readonly count = 0) {}

  async countRecentAttempts(): Promise<number> {
    return this.count;
  }

  async recordAttempt(key: string): Promise<void> {
    this.recorded.push(key);
  }
}

function buildGuard(
  options: RateLimitOptions | undefined,
  limiter: FakeAttemptLimiter,
  request: Record<string, unknown> = { ip: '1.2.3.4', path: '/auth/sessions', body: {} },
) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
    key === RATE_LIMIT_KEY ? options : undefined,
  );

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as never;

  return { guard: new RateLimitGuard(reflector, limiter), context };
}

describe('RateLimitGuard', () => {
  it('ignores routes that are not decorated', async () => {
    const limiter = new FakeAttemptLimiter(999);
    const { guard, context } = buildGuard(undefined, limiter);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(limiter.recorded).toEqual([]);
  });

  it('records an attempt when under the limit', async () => {
    const limiter = new FakeAttemptLimiter(7);
    const { guard, context } = buildGuard(DEFAULT_RATE_LIMIT, limiter);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(limiter.recorded).toHaveLength(1);
  });

  it('throttles once the attempt budget is spent', async () => {
    const limiter = new FakeAttemptLimiter(8);
    const { guard, context } = buildGuard(DEFAULT_RATE_LIMIT, limiter);

    await expect(guard.canActivate(context)).rejects.toThrow(RateLimitedError);
    expect(limiter.recorded).toEqual([]);
  });

  it('hashes the key, so no email or IP is stored in clear', async () => {
    const limiter = new FakeAttemptLimiter(0);
    const { guard, context } = buildGuard(DEFAULT_RATE_LIMIT, limiter, {
      ip: '1.2.3.4',
      path: '/auth/sessions',
      body: { email: 'Empresa@Test.com' },
    });

    await guard.canActivate(context);

    expect(limiter.recorded[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(limiter.recorded[0]).not.toContain('1.2.3.4');
  });

  it('separates callers submitting different emails from the same IP', async () => {
    const limiter = new FakeAttemptLimiter(0);
    const base = { ip: '1.2.3.4', path: '/auth/sessions' };

    const first = buildGuard(DEFAULT_RATE_LIMIT, limiter, { ...base, body: { email: 'a@test.com' } });
    await first.guard.canActivate(first.context);

    const second = buildGuard(DEFAULT_RATE_LIMIT, limiter, { ...base, body: { email: 'b@test.com' } });
    await second.guard.canActivate(second.context);

    expect(limiter.recorded[0]).not.toBe(limiter.recorded[1]);
  });

  it('treats the same email in different cases as one caller', async () => {
    const limiter = new FakeAttemptLimiter(0);
    const base = { ip: '1.2.3.4', path: '/auth/sessions' };

    const first = buildGuard(DEFAULT_RATE_LIMIT, limiter, { ...base, body: { email: 'A@Test.com' } });
    await first.guard.canActivate(first.context);

    const second = buildGuard(DEFAULT_RATE_LIMIT, limiter, { ...base, body: { email: ' a@test.com ' } });
    await second.guard.canActivate(second.context);

    expect(limiter.recorded[0]).toBe(limiter.recorded[1]);
  });
});
