import {
  type DateKey,
  type TimeWindow,
  boliviaDateKey,
  boliviaDateTime,
  boliviaHourMinute,
  datesInWindow,
} from '../../../../shared/domain/bolivia-time.js';

/** The scheduling fields of an event, independent of how they are persisted. */
export interface EventScheduleSource {
  startsAt: Date;
  endsAt: Date;
  registrationStartsAt: Date | null;
  registrationEndsAt: Date | null;
  /** Serialised per-day meeting logistics, as saved by the administrator. */
  meetingHoursJson: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Default working day applied to events stored as bare dates: 08:00-18:00 local. */
const DEFAULT_DAY_START_UTC_HOUR = 12;
const DEFAULT_DAY_END_UTC_HOUR = 22;
const DATE_KEY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Events saved before times were captured are stored as midnight-to-midnight.
 * Read literally they would span whole nights, so they are widened to the
 * default working day instead. Windows that already carry a time are left alone.
 */
export function normalizeDateWindow(start: Date, end: Date): TimeWindow {
  const isDateOnly =
    isUtcMidnight(start) &&
    isUtcMidnight(end) &&
    end.getTime() > start.getTime() &&
    (end.getTime() - start.getTime()) % MS_PER_DAY === 0;

  if (!isDateOnly) return { start, end };

  return {
    start: atUtcHour(start, DEFAULT_DAY_START_UTC_HOUR),
    end: atUtcHour(end, DEFAULT_DAY_END_UTC_HOUR),
  };
}

/** The window the event itself spans. */
export function generalWindow(event: EventScheduleSource): TimeWindow {
  return normalizeDateWindow(event.startsAt, event.endsAt);
}

/**
 * The window meetings may be scheduled in. Saved logistics win, so editing an
 * event never silently moves agendas that already exist. Otherwise the
 * registration period supplies the days, and the event window is the last resort.
 */
export function meetingWindow(event: EventScheduleSource): TimeWindow {
  const savedDates = savedMeetingDates(event.meetingHoursJson);
  if (savedDates.length > 0) {
    return {
      start: boliviaDateTime(savedDates[0], 0, 0),
      end: boliviaDateTime(savedDates[savedDates.length - 1], 24, 0),
    };
  }

  if (!event.registrationStartsAt || !event.registrationEndsAt) return generalWindow(event);

  // Only the days are taken from the registration period; the hours come from
  // the meeting logistics the administrator configures separately.
  return {
    start: boliviaDateTime(boliviaDateKey(event.registrationStartsAt), 0, 0),
    end: boliviaDateTime(boliviaDateKey(event.registrationEndsAt), 24, 0),
  };
}

export function eventDates(event: EventScheduleSource): DateKey[] {
  return datesInWindow(generalWindow(event));
}

export function meetingDates(event: EventScheduleSource): DateKey[] {
  return datesInWindow(meetingWindow(event));
}

/**
 * The stretches of each day that actually host meetings. Saved logistics win,
 * one window per configured range; otherwise every meeting day inherits the
 * hours of the event window. This is what the agenda grid is laid out over.
 */
export function dailyMeetingWindows(event: EventScheduleSource): TimeWindow[] {
  const bounds = meetingWindow(event);

  const configured = savedDailyWindows(event.meetingHoursJson).filter(
    (window) =>
      window.end > window.start && window.start >= bounds.start && window.end <= bounds.end,
  );
  if (configured.length > 0) return configured;

  const opening = boliviaHourMinute(bounds.start);
  const closing = boliviaHourMinute(bounds.end);
  // A window closing at midnight belongs to the day that is ending, so it is
  // read as hour 24 of that day rather than hour 0 of the next one.
  const closingHour = closing.hour === 0 && closing.minute === 0 ? 24 : closing.hour;

  return meetingDates(event)
    .map((date) => {
      const start = boliviaDateTime(date, opening.hour, opening.minute);
      const end = boliviaDateTime(date, closingHour, closing.minute);
      return {
        start: start < bounds.start ? bounds.start : start,
        end: end > bounds.end ? bounds.end : end,
      };
    })
    .filter((window) => window.end > window.start);
}

/** One window per range of the saved logistics, in the order they were saved. */
function savedDailyWindows(meetingHoursJson: string | null): TimeWindow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(meetingHoursJson || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return (parsed as SavedDay[]).flatMap((day) => {
    if (day?.habilitado === false || !Array.isArray(day?.rangos)) return [];

    const date = asText(day?.fecha);
    if (!DATE_KEY_SHAPE.test(date)) return [];

    return (day.rangos as { desde?: unknown; hasta?: unknown }[]).flatMap((range) => {
      const from = asHourMinute(range?.desde);
      const to = asHourMinute(range?.hasta);
      if (!from || !to) return [];

      return [
        {
          start: boliviaDateTime(date, from.hour, from.minute),
          end: boliviaDateTime(date, to.hour, to.minute),
        },
      ];
    });
  });
}

/** `HH:MM` on a 24 hour clock; `24:00` closes the day. */
function asHourMinute(value: unknown): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(typeof value === 'string' ? value : '');
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) return null;

  return { hour, minute };
}

interface SavedDay {
  fecha?: unknown;
  habilitado?: unknown;
  rangos?: unknown;
}

/** Sorted days of the saved logistics that actually host meetings. */
function savedMeetingDates(meetingHoursJson: string | null): DateKey[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(meetingHoursJson || '[]');
  } catch {
    // Legacy or corrupt configuration: fall back to the other sources.
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return (parsed as SavedDay[])
    .filter((day) => day?.habilitado !== false && Array.isArray(day?.rangos) && day.rangos.length > 0)
    .map((day) => asText(day?.fecha))
    .filter((date) => DATE_KEY_SHAPE.test(date))
    .sort();
}

/** Only a real string can be a date key; anything else is discarded. */
function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isUtcMidnight(instant: Date): boolean {
  return instant.getUTCHours() === 0 && instant.getUTCMinutes() === 0;
}

function atUtcHour(instant: Date, hour: number): Date {
  return new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate(), hour, 0, 0),
  );
}
