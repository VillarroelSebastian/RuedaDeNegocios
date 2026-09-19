/**
 * Supplies the current instant. Injecting it keeps use cases deterministic
 * under test instead of reaching for `new Date()`.
 */
export interface ClockPort {
  now(): Date;
}

export const CLOCK_PORT = Symbol('ClockPort');
