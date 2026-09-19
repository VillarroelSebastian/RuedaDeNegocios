import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import type { HourRange } from '../../../eventos/domain/services/meeting-hours.js';

/** `HH:MM` on a 24 hour clock. A company declares hours, never a closing 24:00. */
const HOUR_SHAPE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface NormalizedRanges {
  rangos: HourRange[];
  /** True when a range replaced an earlier one it ran over. */
  huboChoque: boolean;
}

/**
 * The hours a company is willing to meet in. The screen saves one range at a
 * time, so a new range that clashes with an earlier one is read as correcting
 * it: the newest wins, and the company is told that is what happened.
 */
export function normalizeHourRanges(submitted: HourRange[]): NormalizedRanges {
  const rangos: HourRange[] = [];
  let huboChoque = false;

  for (const candidate of submitted) {
    const desde = String(candidate?.desde ?? '');
    const hasta = String(candidate?.hasta ?? '');

    if (!HOUR_SHAPE.test(desde) || !HOUR_SHAPE.test(hasta) || desde >= hasta) {
      throw new ValidationError(
        'Cada rango debe tener horas válidas y la hora inicial debe ser menor a la final.',
      );
    }

    const kept = rangos.filter((earlier) => {
      // Touching end to start is not a clash: 08:00-12:00 and 12:00-16:00 are
      // two shifts of the same day.
      const clashes = desde < earlier.hasta && hasta > earlier.desde;
      if (clashes) huboChoque = true;
      return !clashes;
    });

    rangos.splice(0, rangos.length, ...kept, { desde, hasta });
  }

  return { rangos, huboChoque };
}
