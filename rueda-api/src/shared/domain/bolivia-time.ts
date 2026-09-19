/**
 * The event runs in Bolivia, which sits at UTC-4 all year and observes no
 * daylight saving. Every business date and hour is therefore interpreted in
 * this zone, never in the server's zone.
 */
export const EVENT_TIME_ZONE = 'America/La_Paz';

/** Fixed offset of `EVENT_TIME_ZONE`, in hours. Safe because Bolivia has no DST. */
const UTC_OFFSET_HOURS = 4;

/** A calendar day in `YYYY-MM-DD` form. */
export type DateKey = string;

export interface TimeWindow {
  start: Date;
  /** Exclusive: a window closing at midnight does not include that next day. */
  end: Date;
}

/** Builds the instant of a local wall-clock time. Hour 24 means end of day. */
export function boliviaDateTime(date: DateKey, hour: number, minute: number): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + UTC_OFFSET_HOURS, minute, 0, 0));
}

/** The local calendar day an instant falls on. */
export function boliviaDateKey(instant: Date): DateKey {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The UTC calendar day an instant falls on. */
export function utcDateKey(instant: Date): DateKey {
  const year = instant.getUTCFullYear();
  const month = String(instant.getUTCMonth() + 1).padStart(2, '0');
  const day = String(instant.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface HourMinute {
  hour: number;
  minute: number;
  /** Zero-padded `HH:MM`. */
  hhmm: string;
}

/** The local wall-clock time of an instant, on a 24 hour clock. */
export function boliviaHourMinute(instant: Date): HourMinute {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const hour = Number(parts.find((item) => item.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((item) => item.type === 'minute')?.value ?? 0);
  return {
    hour,
    minute,
    hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

/** Every local day a window touches, ordered and inclusive of both ends. */
export function datesInWindow({ start, end }: TimeWindow): DateKey[] {
  const first = boliviaDateKey(start);
  // The closing instant itself is excluded, so a window ending exactly at
  // midnight belongs to the previous day.
  const last = boliviaDateKey(new Date(end.getTime() - 1));

  const [year, month, day] = first.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  const dates: DateKey[] = [];
  while (utcDateKey(cursor) <= last) {
    dates.push(utcDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
