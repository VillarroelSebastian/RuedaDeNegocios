import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'auth:rate-limit';

export interface RateLimitOptions {
  /** Attempts allowed inside the window before the caller is throttled. */
  attempts: number;
  windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  attempts: 8,
  windowMs: 15 * 60 * 1000,
};

/**
 * Throttles a route by client IP, route and submitted email. Replaces the
 * legacy guard that matched a hardcoded list of paths.
 */
export const RateLimit = (options: Partial<RateLimitOptions> = {}) =>
  SetMetadata(RATE_LIMIT_KEY, { ...DEFAULT_RATE_LIMIT, ...options });
