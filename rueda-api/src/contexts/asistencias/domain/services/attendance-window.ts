import {
  type DateKey,
  boliviaDateKey,
  boliviaHourMinute,
  utcDateKey,
} from '../../../../shared/domain/bolivia-time.js';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';

export interface AttendanceEvent {
  startsAt: Date;
  endsAt: Date;
}

export interface AttendanceDay {
  today: DateKey;
  /** UTC midnight of `today`, the shape stored in `asistenciaevento.fechaAsistencia`. */
  attendanceDate: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Resolves which event day an attendance scan belongs to, and refuses scans
 * outside the event altogether.
 */
export function attendanceDayFor(event: AttendanceEvent, now: Date): AttendanceDay {
  const { startsAt, endsAt } = event;

  // An event saved as bare dates spans exactly one midnight-to-midnight day.
  // No local time was ever captured for it, so its day is read in UTC.
  const isInheritedSingleDay =
    isUtcMidnight(startsAt) &&
    isUtcMidnight(endsAt) &&
    endsAt.getTime() - startsAt.getTime() === MS_PER_DAY;

  const firstDay = isInheritedSingleDay ? utcDateKey(startsAt) : boliviaDateKey(startsAt);

  // A window closing exactly at local midnight belongs to the previous day.
  const adjustedEnd =
    !isInheritedSingleDay && endsAt > startsAt && boliviaHourMinute(endsAt).hhmm === '00:00'
      ? new Date(endsAt.getTime() - 1)
      : endsAt;
  const lastDay = isInheritedSingleDay ? firstDay : boliviaDateKey(adjustedEnd);

  const today = boliviaDateKey(now);
  if (today < firstDay || today > lastDay) {
    throw new ConflictError(
      `La asistencia solo puede registrarse durante el evento (${firstDay} al ${lastDay}).`,
    );
  }

  return { today, attendanceDate: new Date(`${today}T00:00:00.000Z`) };
}

function isUtcMidnight(instant: Date): boolean {
  return instant.getUTCHours() === 0 && instant.getUTCMinutes() === 0;
}
