import { EVENT_TIME_ZONE, boliviaHourMinute } from '../../../../shared/domain/bolivia-time.js';
import type { AssistantTable } from '../models/assistant-view.js';
import { normalizeMessage } from './assistant-intent.js';

/**
 * Reading the company's answer at each step of the booking conversation. Every
 * function here is a pure reading of one message: nothing is decided, looked up
 * or written. What the answers add up to is checked by the requests context,
 * which owns the rules a booking must satisfy.
 */

export interface BookingCandidate {
  id: number;
  nombre: string;
  codigo: string | null;
}

/** The option offered when the company does not care which table it gets. */
export const AUTOMATIC_TABLE = 'Cualquiera / Automática';

const CANCEL = /cancelar|salir|olvidalo|dejalo|ya no/;
const AN_HOUR = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?\b/i;
const A_TIME = /(\d{1,2})[:.](\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/i;
const A_TABLE = /mesa\s*(\d+)/i;
const REFUSAL = /(^|\s)no(\s|$|,)/;
const AGREEMENT = /(^|\s)(si|sii+|confirmo|enviar|dale|ok|listo)(\s|$|,)/;

export function wantsToCancel(message: string): boolean {
  return CANCEL.test(normalizeMessage(message));
}

/** Which company the answer points at: by list number, by name or by code. */
export function pickCandidate(
  message: string,
  candidates: BookingCandidate[],
): BookingCandidate | null {
  const asked = normalizeMessage(message).trim();
  // An empty answer used to match the first company, because every name
  // contains the empty string. Nothing written means nothing chosen.
  if (!asked) return null;

  const index = Number.parseInt(asked, 10);
  if (!Number.isNaN(index)) return candidates[index - 1] ?? null;

  return (
    candidates.find((candidate) => {
      const name = normalizeMessage(candidate.nombre);
      return (
        asked.includes(name) ||
        name.includes(asked) ||
        normalizeMessage(candidate.codigo ?? '') === asked
      );
    }) ?? null
  );
}

export type HourChoice =
  | { kind: 'unreadable' }
  | { kind: 'unavailable' }
  | { kind: 'ambiguous'; hours: number[] }
  | { kind: 'single'; hour: number };

/**
 * Which hour of the clock the company asked for. Without a stated half of the
 * day, "1" means both 01:00 and 13:00, and only the free ones are kept.
 */
export function pickHour(message: string, slots: Date[]): HourChoice {
  const found = AN_HOUR.exec(normalizeMessage(message));
  if (!found) return { kind: 'unreadable' };

  const asked = Number(found[1]);
  const half = found[3]?.toLowerCase().replace(/[.\s]/g, '');
  const hours = half
    ? [half === 'pm' ? (asked % 12) + 12 : asked % 12]
    : [...new Set([asked % 12, (asked % 12) + 12])];

  const free = hours.filter((hour) => slots.some((slot) => boliviaHourMinute(slot).hour === hour));
  if (free.length === 0) return { kind: 'unavailable' };
  if (free.length > 1) return { kind: 'ambiguous', hours: free };

  return { kind: 'single', hour: free[0]! };
}

/** Which of the two halves of the day the company settled on. */
export function pickPeriodHour(message: string, hours: number[]): number | null {
  const asked = normalizeMessage(message);
  const chosen = hours[Number(asked) - 1];
  if (chosen != null) return chosen;

  if (/p/.test(asked)) return hours.find((hour) => hour >= 12) ?? null;
  if (/a/.test(asked)) return hours.find((hour) => hour < 12) ?? null;

  return null;
}

/**
 * Which slot the company picked. The label shown is matched first, text against
 * text: comparing a 12 hour label against a 24 hour clock used to pick the
 * wrong slot.
 */
export function pickSlot(message: string, slots: Date[], options: string[]): Date | null {
  const asked = normalizeMessage(message).trim();

  const tapped = options.findIndex((option) => normalizeMessage(option).trim() === asked);
  if (tapped !== -1 && slots[tapped]) return slots[tapped];

  const index = Number.parseInt(asked, 10);
  if (!Number.isNaN(index) && slots[index - 1]) return slots[index - 1]!;

  const written = A_TIME.exec(asked);
  if (!written) return null;

  let hour = Number.parseInt(written[1]!, 10);
  const half = written[3]?.toLowerCase().replace(/[.\s]/g, '');
  if (half === 'pm' && hour < 12) hour += 12;
  if (half === 'am' && hour === 12) hour = 0;
  const hhmm = `${String(hour).padStart(2, '0')}:${written[2]}`;

  return slots.find((slot) => boliviaHourMinute(slot).hhmm === hhmm) ?? null;
}

export function pickMeetingType(message: string): 'PRESENCIAL' | 'VIRTUAL' | null {
  const asked = normalizeMessage(message);
  if (/virtual/.test(asked)) return 'VIRTUAL';
  if (/presencial/.test(asked)) return 'PRESENCIAL';

  return null;
}

export type TableChoice =
  | { kind: 'unreadable' }
  | { kind: 'automatic' }
  | { kind: 'table'; tableId: number };

export function pickTable(
  message: string,
  tables: AssistantTable[],
  options: string[],
): TableChoice {
  const asked = normalizeMessage(message).trim();

  let chosen = options.findIndex((option) => normalizeMessage(option).trim() === asked);
  if (chosen === -1) {
    const index = Number.parseInt(asked, 10);
    if (!Number.isNaN(index) && options[index - 1]) chosen = index - 1;
  }

  if (chosen !== -1) {
    if (options[chosen] === AUTOMATIC_TABLE) return { kind: 'automatic' };

    const table = tables.find((candidate) => `Mesa ${candidate.numeroMesa}` === options[chosen]);
    return table ? { kind: 'table', tableId: table.id } : { kind: 'unreadable' };
  }

  if (/automat|cualquiera/.test(asked)) return { kind: 'automatic' };

  const written = A_TABLE.exec(asked);
  if (!written) return { kind: 'unreadable' };

  const table = tables.find((candidate) => candidate.numeroMesa === Number.parseInt(written[1]!, 10));
  return table ? { kind: 'table', tableId: table.id } : { kind: 'unreadable' };
}

export type Confirmation = 'send' | 'cancel' | 'unclear';

export function readConfirmation(message: string): Confirmation {
  const asked = normalizeMessage(message);
  if (REFUSAL.test(asked) || CANCEL.test(asked)) return 'cancel';

  return AGREEMENT.test(asked) ? 'send' : 'unclear';
}

/** "9 a. m." — the half of the day, without the minutes. */
export function hourLabel(instant: Date): string {
  return instant.toLocaleTimeString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    hour12: true,
  });
}

/** "9:20 a. m." — one slot of the grid. */
export function intervalLabel(instant: Date): string {
  return instant.toLocaleTimeString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
