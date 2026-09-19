import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { normalizeHourRanges } from './hour-ranges.js';

describe('normalizeHourRanges', () => {
  it('keeps ranges that do not touch each other', () => {
    const result = normalizeHourRanges([
      { desde: '08:00', hasta: '12:00' },
      { desde: '14:00', hasta: '18:00' },
    ]);

    expect(result.rangos).toEqual([
      { desde: '08:00', hasta: '12:00' },
      { desde: '14:00', hasta: '18:00' },
    ]);
    expect(result.huboChoque).toBe(false);
  });

  /**
   * The screen saves one range at a time, so a new range that clashes is the
   * correction of the old one: the newest wins and the company is told.
   */
  it('lets a newer range replace the one it clashes with', () => {
    const result = normalizeHourRanges([
      { desde: '08:00', hasta: '12:00' },
      { desde: '10:00', hasta: '14:00' },
    ]);

    expect(result.rangos).toEqual([{ desde: '10:00', hasta: '14:00' }]);
    expect(result.huboChoque).toBe(true);
  });

  it('replaces every earlier range the new one runs over', () => {
    const result = normalizeHourRanges([
      { desde: '08:00', hasta: '09:00' },
      { desde: '10:00', hasta: '11:00' },
      { desde: '08:30', hasta: '12:00' },
    ]);

    expect(result.rangos).toEqual([{ desde: '08:30', hasta: '12:00' }]);
  });

  it('lets two ranges meet end to start', () => {
    const result = normalizeHourRanges([
      { desde: '08:00', hasta: '12:00' },
      { desde: '12:00', hasta: '16:00' },
    ]);

    expect(result.rangos).toHaveLength(2);
    expect(result.huboChoque).toBe(false);
  });

  it('accepts an empty list as clearing the hours', () => {
    expect(normalizeHourRanges([])).toEqual({ rangos: [], huboChoque: false });
  });

  it.each([
    ['24:00', '25:00'],
    ['8:00', '12:00'],
    ['08:60', '12:00'],
    ['mañana', 'tarde'],
  ])('refuses %s-%s as hours', (desde, hasta) => {
    expect(() => normalizeHourRanges([{ desde, hasta }])).toThrow(
      'Cada rango debe tener horas válidas y la hora inicial debe ser menor a la final.',
    );
  });

  it('refuses a range that ends before it starts', () => {
    expect(() => normalizeHourRanges([{ desde: '18:00', hasta: '08:00' }])).toThrow(
      ValidationError,
    );
  });

  it('refuses a range of no length', () => {
    expect(() => normalizeHourRanges([{ desde: '08:00', hasta: '08:00' }])).toThrow(
      ValidationError,
    );
  });
});
