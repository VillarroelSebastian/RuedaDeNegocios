/** Counts and records throttled attempts, keyed by an opaque digest. */
export interface AttemptLimiterPort {
  countRecentAttempts(key: string, windowMs: number): Promise<number>;
  recordAttempt(key: string): Promise<void>;
}

export const ATTEMPT_LIMITER_PORT = Symbol('AttemptLimiterPort');
