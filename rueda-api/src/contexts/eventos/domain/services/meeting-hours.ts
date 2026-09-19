import type { DateKey } from '../../../../shared/domain/bolivia-time.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

export interface HourRange {
  desde: string;
  hasta: string;
}

export interface DailyMeetingHours {
  fecha: DateKey;
  habilitado: boolean;
  rangos: HourRange[];
}

export interface NormalizeOptions {
  /** Days the result must cover, in order. */
  dates: DateKey[];
  defaultFrom: string;
  defaultTo: string;
  /** When true, every expected day must be configured explicitly. */
  allDaysRequired: boolean;
}

/** `HH:MM` on a 24 hour clock; `24:00` is allowed as a closing time. */
const HOUR_SHAPE = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

/**
 * Turns whatever the administrator submitted into one entry per expected day,
 * with sorted, valid, non-overlapping ranges.
 */
export function normalizeDailyMeetingHours(
  submitted: unknown,
  options: NormalizeOptions,
): DailyMeetingHours[] {
  const parsed = parseSubmitted(submitted);
  // Nothing configured at all is not an error: every day gets the default
  // range, and only then are the per-day rules applied.
  const configured: RawDay[] =
    parsed.length > 0 ? parsed : options.dates.map((fecha) => defaultDay(fecha, options));

  const byDate = new Map<string, RawDay>(
    configured.map((day) => [typeof day?.fecha === 'string' ? day.fecha : '', day]),
  );

  return options.dates.map((fecha) => {
    const day = byDate.get(fecha);
    if (!day) {
      if (options.allDaysRequired) {
        throw new ValidationError(`Debes configurar horarios de reunión para el día ${fecha}.`);
      }
      return defaultDay(fecha, options);
    }

    const habilitado = day.habilitado !== false;
    const rangos =
      habilitado && Array.isArray(day.rangos)
        ? day.rangos.map((range) => ({
            desde: String((range as HourRange)?.desde || ''),
            hasta: String((range as HourRange)?.hasta || ''),
          }))
        : [];

    if (habilitado && rangos.length === 0) {
      throw new ValidationError(`Agrega al menos un rango para el día ${fecha}.`);
    }

    rangos.sort((left, right) => left.desde.localeCompare(right.desde));
    assertRangesAreValid(rangos, fecha);

    return { fecha, habilitado, rangos };
  });
}

interface RawDay {
  fecha?: unknown;
  habilitado?: unknown;
  rangos?: unknown;
}

function parseSubmitted(submitted: unknown): RawDay[] {
  let value = submitted;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      throw new ValidationError('La configuración de horarios no es válida.');
    }
  }
  return Array.isArray(value) ? (value as RawDay[]) : [];
}

function defaultDay(fecha: DateKey, options: NormalizeOptions): DailyMeetingHours {
  return {
    fecha,
    habilitado: true,
    rangos: [{ desde: options.defaultFrom, hasta: options.defaultTo }],
  };
}

function assertRangesAreValid(rangos: HourRange[], fecha: DateKey): void {
  rangos.forEach((rango, index) => {
    if (!HOUR_SHAPE.test(rango.desde) || !HOUR_SHAPE.test(rango.hasta) || rango.desde >= rango.hasta) {
      throw new ValidationError(`El rango ${rango.desde}-${rango.hasta} del día ${fecha} no es válido.`);
    }
    // Ranges are already sorted, so only the previous one can overlap.
    if (index > 0 && rangos[index - 1].hasta > rango.desde) {
      throw new ValidationError(`Los rangos del día ${fecha} no pueden superponerse.`);
    }
  });
}
