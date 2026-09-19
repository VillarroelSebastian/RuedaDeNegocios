import { describe, expect, it } from 'vitest';
import {
  EVENT_TIME_ZONE,
  boliviaDateKey,
  boliviaDateTime,
  boliviaHourMinute,
  datesInWindow,
  utcDateKey,
} from './bolivia-time.js';

describe('EVENT_TIME_ZONE', () => {
  it('is the zone the event is actually held in', () => {
    expect(EVENT_TIME_ZONE).toBe('America/La_Paz');
  });
});

describe('boliviaDateTime', () => {
  it('maps local midnight to 04:00 UTC, since Bolivia is UTC-4 all year', () => {
    expect(boliviaDateTime('2026-10-15', 0, 0).toISOString()).toBe('2026-10-15T04:00:00.000Z');
  });

  it('maps local 08:00 to 12:00 UTC', () => {
    expect(boliviaDateTime('2026-10-15', 8, 0).toISOString()).toBe('2026-10-15T12:00:00.000Z');
  });

  it('treats hour 24 as the end of that day, rolling into the next one', () => {
    expect(boliviaDateTime('2026-10-15', 24, 0).toISOString()).toBe('2026-10-16T04:00:00.000Z');
  });

  it('keeps minutes', () => {
    expect(boliviaDateTime('2026-10-15', 18, 30).toISOString()).toBe('2026-10-15T22:30:00.000Z');
  });
});

describe('boliviaDateKey', () => {
  it('reads the local calendar day, not the UTC one', () => {
    expect(boliviaDateKey(new Date('2026-10-15T04:00:00.000Z'))).toBe('2026-10-15');
  });

  it('still belongs to the previous local day one millisecond earlier', () => {
    expect(boliviaDateKey(new Date('2026-10-15T03:59:59.999Z'))).toBe('2026-10-14');
  });

  it('pads month and day', () => {
    expect(boliviaDateKey(new Date('2026-01-05T12:00:00.000Z'))).toBe('2026-01-05');
  });
});

describe('utcDateKey', () => {
  it('reads the UTC calendar day', () => {
    expect(utcDateKey(new Date('2026-10-15T03:59:59.999Z'))).toBe('2026-10-15');
  });
});

describe('boliviaHourMinute', () => {
  it('reports local midnight for 04:00 UTC', () => {
    expect(boliviaHourMinute(new Date('2026-10-15T04:00:00.000Z'))).toEqual({
      hour: 0,
      minute: 0,
      hhmm: '00:00',
    });
  });

  it('reports local 18:00 for 22:00 UTC', () => {
    expect(boliviaHourMinute(new Date('2026-10-15T22:00:00.000Z')).hhmm).toBe('18:00');
  });

  it('uses a 24 hour clock rather than wrapping at noon', () => {
    expect(boliviaHourMinute(new Date('2026-10-15T03:00:00.000Z')).hhmm).toBe('23:00');
  });
});

describe('datesInWindow', () => {
  it('lists every local day a window covers', () => {
    const dates = datesInWindow({
      start: boliviaDateTime('2026-10-15', 0, 0),
      end: boliviaDateTime('2026-10-17', 24, 0),
    });

    expect(dates).toEqual(['2026-10-15', '2026-10-16', '2026-10-17']);
  });

  it('returns a single day for a window that closes the same day', () => {
    const dates = datesInWindow({
      start: boliviaDateTime('2026-10-15', 8, 0),
      end: boliviaDateTime('2026-10-15', 18, 0),
    });

    expect(dates).toEqual(['2026-10-15']);
  });

  it('excludes the closing instant, so a window ending at midnight stops the day before', () => {
    const dates = datesInWindow({
      start: boliviaDateTime('2026-10-15', 0, 0),
      end: boliviaDateTime('2026-10-16', 0, 0),
    });

    expect(dates).toEqual(['2026-10-15']);
  });

  it('crosses a month boundary', () => {
    const dates = datesInWindow({
      start: boliviaDateTime('2026-10-30', 0, 0),
      end: boliviaDateTime('2026-11-01', 24, 0),
    });

    expect(dates).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });
});
