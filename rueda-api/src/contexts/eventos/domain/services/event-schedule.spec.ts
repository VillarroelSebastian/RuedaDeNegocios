import { describe, expect, it } from 'vitest';
import { boliviaDateTime } from '../../../../shared/domain/bolivia-time.js';
import {
  type EventScheduleSource,
  dailyMeetingWindows,
  eventDates,
  generalWindow,
  meetingDates,
  meetingWindow,
  normalizeDateWindow,
} from './event-schedule.js';

const iso = (date: Date) => date.toISOString();

function buildEvent(overrides: Partial<EventScheduleSource> = {}): EventScheduleSource {
  return {
    startsAt: new Date('2026-10-15T12:00:00.000Z'),
    endsAt: new Date('2026-10-17T22:00:00.000Z'),
    registrationStartsAt: null,
    registrationEndsAt: null,
    meetingHoursJson: null,
    ...overrides,
  };
}

describe('normalizeDateWindow', () => {
  it('expands a date-only window into the default 08:00-18:00 local working day', () => {
    const window = normalizeDateWindow(
      new Date('2026-10-15T00:00:00.000Z'),
      new Date('2026-10-17T00:00:00.000Z'),
    );

    // 12:00 and 22:00 UTC are 08:00 and 18:00 in Bolivia.
    expect(iso(window.start)).toBe('2026-10-15T12:00:00.000Z');
    expect(iso(window.end)).toBe('2026-10-17T22:00:00.000Z');
  });

  it('leaves a window that already carries times untouched', () => {
    const start = new Date('2026-10-15T13:30:00.000Z');
    const end = new Date('2026-10-17T21:00:00.000Z');

    expect(normalizeDateWindow(start, end)).toEqual({ start, end });
  });

  it('leaves an empty window untouched, because the end must be after the start', () => {
    const instant = new Date('2026-10-15T00:00:00.000Z');

    expect(normalizeDateWindow(instant, instant)).toEqual({ start: instant, end: instant });
  });

  it('leaves a window untouched when it is not a whole number of days', () => {
    const start = new Date('2026-10-15T00:00:00.000Z');
    const end = new Date('2026-10-17T06:00:00.000Z');

    expect(normalizeDateWindow(start, end)).toEqual({ start, end });
  });
});

describe('meetingWindow', () => {
  it('uses the saved logistics days when they exist', () => {
    const window = meetingWindow(
      buildEvent({
        meetingHoursJson: JSON.stringify([
          { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
          { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
        ]),
      }),
    );

    expect(iso(window.start)).toBe('2026-11-03T04:00:00.000Z');
    expect(iso(window.end)).toBe('2026-11-05T04:00:00.000Z');
  });

  it('ignores days that are disabled or carry no ranges', () => {
    const window = meetingWindow(
      buildEvent({
        meetingHoursJson: JSON.stringify([
          { fecha: '2026-11-02', habilitado: false, rangos: [{ desde: '09:00', hasta: '12:00' }] },
          { fecha: '2026-11-03', habilitado: true, rangos: [] },
          { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
        ]),
      }),
    );

    expect(iso(window.start)).toBe('2026-11-04T04:00:00.000Z');
    expect(iso(window.end)).toBe('2026-11-05T04:00:00.000Z');
  });

  it('sorts saved days, so their stored order does not matter', () => {
    const window = meetingWindow(
      buildEvent({
        meetingHoursJson: JSON.stringify([
          { fecha: '2026-11-05', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
          { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
        ]),
      }),
    );

    expect(iso(window.start)).toBe('2026-11-03T04:00:00.000Z');
    expect(iso(window.end)).toBe('2026-11-06T04:00:00.000Z');
  });

  it('falls back to the registration period when no logistics are saved', () => {
    const window = meetingWindow(
      buildEvent({
        registrationStartsAt: new Date('2026-11-10T16:00:00.000Z'),
        registrationEndsAt: new Date('2026-11-12T16:00:00.000Z'),
      }),
    );

    expect(iso(window.start)).toBe('2026-11-10T04:00:00.000Z');
    expect(iso(window.end)).toBe('2026-11-13T04:00:00.000Z');
  });

  it('falls back to the event window when the registration period is incomplete', () => {
    const event = buildEvent({ registrationStartsAt: new Date('2026-11-10T16:00:00.000Z') });

    expect(meetingWindow(event)).toEqual(generalWindow(event));
  });

  it('falls back instead of throwing when the saved logistics are corrupt', () => {
    const event = buildEvent({ meetingHoursJson: 'not json' });

    expect(meetingWindow(event)).toEqual(generalWindow(event));
  });

  it('ignores saved days whose date is malformed', () => {
    const event = buildEvent({
      meetingHoursJson: JSON.stringify([
        { fecha: '03/11/2026', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
      ]),
    });

    expect(meetingWindow(event)).toEqual(generalWindow(event));
  });
});

describe('eventDates and meetingDates', () => {
  it('lists the days of the event window', () => {
    expect(eventDates(buildEvent())).toEqual(['2026-10-15', '2026-10-16', '2026-10-17']);
  });

  it('lists the days of the meeting window', () => {
    const event = buildEvent({
      meetingHoursJson: JSON.stringify([
        { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
        { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
      ]),
    });

    expect(meetingDates(event)).toEqual(['2026-11-03', '2026-11-04']);
  });

  it('keeps a date-only event inclusive of its last day', () => {
    const event = buildEvent({
      startsAt: new Date('2026-10-15T00:00:00.000Z'),
      endsAt: new Date('2026-10-17T00:00:00.000Z'),
    });

    expect(eventDates(event)).toEqual(['2026-10-15', '2026-10-16', '2026-10-17']);
  });
});

describe('dailyMeetingWindows', () => {
  it('gives every meeting day the hours of the event window', () => {
    const windows = dailyMeetingWindows(buildEvent());

    expect(windows).toHaveLength(3);
    expect(iso(windows[0].start)).toBe('2026-10-15T12:00:00.000Z');
    expect(iso(windows[0].end)).toBe('2026-10-15T22:00:00.000Z');
    expect(iso(windows[2].start)).toBe('2026-10-17T12:00:00.000Z');
  });

  it('follows the saved logistics, one window per range', () => {
    const event = buildEvent({
      meetingHoursJson: JSON.stringify([
        {
          fecha: '2026-10-15',
          habilitado: true,
          rangos: [
            { desde: '09:00', hasta: '12:00' },
            { desde: '14:00', hasta: '17:00' },
          ],
        },
        { fecha: '2026-10-16', habilitado: false, rangos: [{ desde: '09:00', hasta: '12:00' }] },
      ]),
    });

    const windows = dailyMeetingWindows(event);

    expect(windows).toHaveLength(2);
    expect(iso(windows[0].start)).toBe('2026-10-15T13:00:00.000Z');
    expect(iso(windows[1].end)).toBe('2026-10-15T21:00:00.000Z');
  });

  it('keeps a day that closes at midnight inside the day that is ending', () => {
    const event = buildEvent({
      meetingHoursJson: JSON.stringify([
        { fecha: '2026-10-15', habilitado: true, rangos: [{ desde: '20:00', hasta: '24:00' }] },
      ]),
    });

    expect(iso(dailyMeetingWindows(event)[0].end)).toBe('2026-10-16T04:00:00.000Z');
  });

  it('falls back to the inherited day when the saved logistics are corrupt', () => {
    const event = buildEvent({ meetingHoursJson: '{not json' });

    expect(dailyMeetingWindows(event)).toHaveLength(3);
  });

  // The saved logistics are what define the meeting window in the first place,
  // so a day outside the event dates moves the agenda rather than being dropped.
  // Only ranges of a day that was disabled, or that cannot be read, fall away.
  it('lets the saved logistics carry the agenda outside the event dates', () => {
    const event = buildEvent({
      meetingHoursJson: JSON.stringify([
        { fecha: '2026-12-01', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
      ]),
    });

    const windows = dailyMeetingWindows(event);

    expect(windows).toHaveLength(1);
    expect(iso(windows[0].start)).toBe('2026-12-01T13:00:00.000Z');
  });

  it('drops a range that cannot be read as a time of day', () => {
    const event = buildEvent({
      meetingHoursJson: JSON.stringify([
        {
          fecha: '2026-10-15',
          habilitado: true,
          rangos: [
            { desde: 'mañana', hasta: '12:00' },
            { desde: '14:00', hasta: '17:00' },
          ],
        },
      ]),
    });

    expect(dailyMeetingWindows(event)).toHaveLength(1);
  });
});

describe('boliviaDateTime interplay', () => {
  it('produces the same instant the schedule helpers rely on', () => {
    expect(iso(boliviaDateTime('2026-11-03', 0, 0))).toBe('2026-11-03T04:00:00.000Z');
  });
});
