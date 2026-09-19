import {
  type DateKey,
  type TimeWindow,
  boliviaDateKey,
  boliviaDateTime,
} from '../../../../shared/domain/bolivia-time.js';

/** A slot a meeting could occupy. */
export interface Slot {
  inicio: Date;
  fin: Date;
}

const MS_PER_MINUTE = 60_000;
/** Meetings are booked on five minute marks, never at 09:03. */
const STEP_MINUTES = 5;

function slotsOver(window: TimeWindow, durationMs: number, strideMs: number, from: Date): Slot[] {
  const slots: Slot[] = [];

  for (
    let current = from;
    current.getTime() + durationMs <= window.end.getTime();
    current = new Date(current.getTime() + strideMs)
  ) {
    slots.push({ inicio: current, fin: new Date(current.getTime() + durationMs) });
  }

  return slots;
}

/** The next five minute mark at or after an instant, counted from local midnight. */
function roundUpToStep(instant: Date, stepMs: number): Date {
  const midnight = boliviaDateTime(boliviaDateKey(instant), 0, 0);
  const offset = instant.getTime() - midnight.getTime();
  return new Date(midnight.getTime() + Math.ceil(offset / stepMs) * stepMs);
}

/**
 * The fixed grid the "my hours" screen is drawn on: one slot per meeting plus
 * the break that follows it. Each day starts exactly at the configured hour.
 */
export function fixedSlots(
  windows: TimeWindow[],
  durationMinutes: number,
  breakMinutes: number,
): Slot[] {
  const durationMs = Math.max(0, durationMinutes) * MS_PER_MINUTE;
  if (durationMs === 0) return [];

  const strideMs = durationMs + Math.max(0, breakMinutes) * MS_PER_MINUTE;

  return windows.flatMap((window) => slotsOver(window, durationMs, strideMs, window.start));
}

/**
 * Every start a meeting could have: any five minute mark whose meeting still
 * fits the window. Unlike the fixed grid this offers the whole availability,
 * and the clashes are filtered out afterwards by overlap.
 */
export function startCandidates(windows: TimeWindow[], durationMinutes: number): Slot[] {
  const durationMs = Math.max(0, durationMinutes) * MS_PER_MINUTE;
  if (durationMs === 0) return [];

  const stepMs = STEP_MINUTES * MS_PER_MINUTE;

  return windows.flatMap((window) =>
    slotsOver(window, durationMs, stepMs, roundUpToStep(window.start, stepMs)),
  );
}

/**
 * The working day of the event team: any hour of the local day, every five
 * minutes, whatever hours the companies declared. The only availability it
 * really has to respect is the table's.
 */
export function technicianCandidates(dates: DateKey[], durationMinutes: number): Slot[] {
  return startCandidates(
    dates.map((date) => ({
      start: boliviaDateTime(date, 0, 0),
      end: boliviaDateTime(date, 24, 0),
    })),
    durationMinutes,
  );
}
