import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

const MS_PER_MINUTE = 60_000;

function asInstant(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;

  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** The two instants a booking spans, as the client asked for them. */
export function parseBookingWindow(start: unknown, end: unknown): TimeWindow {
  const from = asInstant(start);
  const to = asInstant(end);
  if (!from || !to) throw new ValidationError('inicio y fin requeridos');

  // A reversed window matches every booking at once, which the legacy endpoint
  // then reported as every table being free.
  if (to.getTime() <= from.getTime()) {
    throw new ValidationError('La hora de fin debe ser posterior a la de inicio.');
  }

  return { start: from, end: to };
}

/**
 * The stretch a booking really consumes on a table. Two meetings cannot run
 * back to back: the room has to be cleared between them, and the administrator
 * configures how long that takes as `tiempoEntreReuniones`.
 */
export function windowWithCleanup(window: TimeWindow, cleanupMinutes: number): TimeWindow {
  const buffer = Math.max(0, cleanupMinutes) * MS_PER_MINUTE;
  if (buffer === 0) return window;

  return {
    start: new Date(window.start.getTime() - buffer),
    end: new Date(window.end.getTime() + buffer),
  };
}

/**
 * One seat per table number. The data carries duplicate numbers, because the
 * legacy `generar` endpoint appended tables while the auto-sync recreated the
 * same numbers, and offering the same table twice double-books it.
 */
export function dedupeTablesByNumber<T extends { id: number; numeroMesa: number }>(
  tables: T[],
): T[] {
  const byNumber = new Map<number, T>();

  for (const table of tables) {
    const kept = byNumber.get(table.numeroMesa);
    // The oldest row is the one meetings already point at.
    if (!kept || table.id < kept.id) byNumber.set(table.numeroMesa, table);
  }

  return [...byNumber.values()];
}
