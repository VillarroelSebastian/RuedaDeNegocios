import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  dedupeTablesByNumber,
  parseBookingWindow,
  windowWithCleanup,
} from './table-availability.js';

const START = '2026-11-10T14:00:00.000Z';
const END = '2026-11-10T14:30:00.000Z';

describe('parseBookingWindow', () => {
  it('reads the two instants a booking spans', () => {
    const window = parseBookingWindow(START, END);

    expect(window.start.toISOString()).toBe(START);
    expect(window.end.toISOString()).toBe(END);
  });

  it('refuses a window that is missing an end', () => {
    expect(() => parseBookingWindow(START, undefined)).toThrow('inicio y fin requeridos');
  });

  it('refuses instants that are not instants', () => {
    expect(() => parseBookingWindow('mañana', END)).toThrow(ValidationError);
  });

  // The legacy endpoint took both instants as given, so a reversed window asked
  // the database for every table at once and reported them all free.
  it('refuses a window that ends before it starts', () => {
    expect(() => parseBookingWindow(END, START)).toThrow(
      'La hora de fin debe ser posterior a la de inicio.',
    );
  });

  it('refuses a window of no length', () => {
    expect(() => parseBookingWindow(START, START)).toThrow(ValidationError);
  });
});

describe('windowWithCleanup', () => {
  const window = { start: new Date(START), end: new Date(END) };

  it('widens the window by the cleanup time on both sides', () => {
    const widened = windowWithCleanup(window, 10);

    expect(widened.start.toISOString()).toBe('2026-11-10T13:50:00.000Z');
    expect(widened.end.toISOString()).toBe('2026-11-10T14:40:00.000Z');
  });

  it('leaves the window alone when there is no cleanup time', () => {
    expect(windowWithCleanup(window, 0)).toEqual(window);
  });

  it('never narrows a window', () => {
    expect(windowWithCleanup(window, -30)).toEqual(window);
  });
});

describe('dedupeTablesByNumber', () => {
  /**
   * Duplicate table numbers exist in the data because the legacy `generar`
   * endpoint appended tables while a second code path recreated the same
   * numbers. Two tables numbered 3 must still offer one seat.
   */
  it('keeps the oldest table of each number', () => {
    const tables = [
      { id: 9, numeroMesa: 3 },
      { id: 4, numeroMesa: 3 },
      { id: 7, numeroMesa: 1 },
    ];

    expect(dedupeTablesByNumber(tables)).toEqual([
      { id: 4, numeroMesa: 3 },
      { id: 7, numeroMesa: 1 },
    ]);
  });

  it('leaves a clean list untouched', () => {
    const tables = [
      { id: 1, numeroMesa: 1 },
      { id: 2, numeroMesa: 2 },
    ];

    expect(dedupeTablesByNumber(tables)).toEqual(tables);
  });
});
