import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { assertRegistrationOpen } from './registration-window.js';

const NOW = new Date('2026-09-18T12:00:00Z');

describe('assertRegistrationOpen', () => {
  it('accepts an event that declares no registration period', () => {
    expect(() =>
      assertRegistrationOpen({ opensAt: null, closesAt: null }, NOW),
    ).not.toThrow();
  });

  it('accepts an instant inside the period', () => {
    expect(() =>
      assertRegistrationOpen(
        { opensAt: new Date('2026-09-01T00:00:00Z'), closesAt: new Date('2026-10-01T00:00:00Z') },
        NOW,
      ),
    ).not.toThrow();
  });

  it('refuses before the period opens, naming the opening date', () => {
    expect(() =>
      assertRegistrationOpen({ opensAt: new Date('2026-09-20T00:00:00Z'), closesAt: null }, NOW),
    ).toThrow(/Las inscripciones abren el/);
  });

  it('refuses after the period closed, naming the closing date', () => {
    expect(() =>
      assertRegistrationOpen({ opensAt: null, closesAt: new Date('2026-09-17T00:00:00Z') }, NOW),
    ).toThrow(/El período de inscripción cerró el/);
  });

  it('raises a validation error, not a plain one', () => {
    expect(() =>
      assertRegistrationOpen({ opensAt: new Date('2026-09-20T00:00:00Z'), closesAt: null }, NOW),
    ).toThrow(ValidationError);
  });

  // The legacy comparisons are strict, so the boundary instants are inside the
  // period: someone submitting exactly at the opening second is not turned away.
  it('treats both boundaries as open', () => {
    expect(() => assertRegistrationOpen({ opensAt: NOW, closesAt: null }, NOW)).not.toThrow();
    expect(() => assertRegistrationOpen({ opensAt: null, closesAt: NOW }, NOW)).not.toThrow();
  });

  it('reports the dates in the event time zone', () => {
    // 2026-09-20T02:00:00Z is still the 19th in Bolivia (UTC-4).
    expect(() =>
      assertRegistrationOpen(
        { opensAt: new Date('2026-09-20T02:00:00Z'), closesAt: null },
        NOW,
      ),
    ).toThrow(/19\/9\/2026/);
  });
});
