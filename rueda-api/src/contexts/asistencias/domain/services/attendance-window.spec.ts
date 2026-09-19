import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { attendanceDayFor } from './attendance-window.js';

const event = (startsAt: string, endsAt: string) => ({
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
});

// A two-day event stored with real times: 08:00 to 18:00 Bolivian.
const TIMED = event('2026-11-03T12:00:00.000Z', '2026-11-04T22:00:00.000Z');

describe('attendanceDayFor', () => {
  describe('an event stored with times', () => {
    it('accepts the first day', () => {
      const result = attendanceDayFor(TIMED, new Date('2026-11-03T14:00:00.000Z'));

      expect(result.today).toBe('2026-11-03');
      expect(result.attendanceDate.toISOString()).toBe('2026-11-03T00:00:00.000Z');
    });

    it('accepts the last day', () => {
      expect(attendanceDayFor(TIMED, new Date('2026-11-04T23:00:00.000Z')).today).toBe(
        '2026-11-04',
      );
    });

    it('accepts an hour outside the working day, as long as the date matches', () => {
      // 02:00 UTC on the 4th is 22:00 local on the 3rd: still the first day.
      expect(attendanceDayFor(TIMED, new Date('2026-11-04T02:00:00.000Z')).today).toBe(
        '2026-11-03',
      );
    });

    it('refuses the day before the event', () => {
      expect(() => attendanceDayFor(TIMED, new Date('2026-11-02T14:00:00.000Z'))).toThrow(
        ConflictError,
      );
    });

    it('refuses the day after the event', () => {
      expect(() => attendanceDayFor(TIMED, new Date('2026-11-05T14:00:00.000Z'))).toThrow(
        ConflictError,
      );
    });

    it('names the allowed range in the refusal', () => {
      expect(() => attendanceDayFor(TIMED, new Date('2026-12-01T14:00:00.000Z'))).toThrow(
        /solo puede registrarse durante el evento \(2026-11-03 al 2026-11-04\)/,
      );
    });
  });

  describe('a one-day event inherited as bare dates', () => {
    // Midnight to midnight, exactly 24 hours apart.
    const SINGLE = event('2026-11-03T00:00:00.000Z', '2026-11-04T00:00:00.000Z');

    it('reads the day in UTC, because no local time was ever captured', () => {
      expect(attendanceDayFor(SINGLE, new Date('2026-11-03T14:00:00.000Z')).today).toBe(
        '2026-11-03',
      );
    });

    it('allows that single day only', () => {
      expect(() => attendanceDayFor(SINGLE, new Date('2026-11-04T14:00:00.000Z'))).toThrow(
        /2026-11-03 al 2026-11-03/,
      );
    });
  });

  describe('an event closing at local midnight', () => {
    // Ends at 04:00 UTC, which is 00:00 local on the 5th.
    const CLOSING = event('2026-11-03T04:00:00.000Z', '2026-11-05T04:00:00.000Z');

    it('treats the closing midnight as belonging to the previous day', () => {
      expect(attendanceDayFor(CLOSING, new Date('2026-11-04T14:00:00.000Z')).today).toBe(
        '2026-11-04',
      );
    });

    it('refuses the day the window closes on', () => {
      expect(() => attendanceDayFor(CLOSING, new Date('2026-11-05T14:00:00.000Z'))).toThrow(
        /2026-11-03 al 2026-11-04/,
      );
    });
  });

  it('returns the attendance date as a UTC midnight key, matching the column', () => {
    const result = attendanceDayFor(TIMED, new Date('2026-11-04T05:00:00.000Z'));

    expect(result.attendanceDate.toISOString()).toBe('2026-11-04T00:00:00.000Z');
  });
});
