import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { normalizeDailyMeetingHours } from './meeting-hours.js';

const DATES = ['2026-11-03', '2026-11-04'];
const options = { dates: DATES, defaultFrom: '08:00', defaultTo: '18:00', allDaysRequired: true };

const day = (fecha: string, ...rangos: { desde: string; hasta: string }[]) => ({
  fecha,
  habilitado: true,
  rangos,
});

describe('normalizeDailyMeetingHours', () => {
  describe('defaults', () => {
    it('fills every expected day when nothing is configured', () => {
      expect(normalizeDailyMeetingHours(undefined, options)).toEqual([
        { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '08:00', hasta: '18:00' }] },
        { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '08:00', hasta: '18:00' }] },
      ]);
    });

    it('treats an empty array as nothing configured', () => {
      expect(normalizeDailyMeetingHours([], options)).toHaveLength(2);
    });

    it('accepts the configuration as a JSON string', () => {
      const parsed = normalizeDailyMeetingHours(
        JSON.stringify([
          day('2026-11-03', { desde: '09:00', hasta: '12:00' }),
          day('2026-11-04', { desde: '09:00', hasta: '12:00' }),
        ]),
        options,
      );

      expect(parsed[0].rangos).toEqual([{ desde: '09:00', hasta: '12:00' }]);
    });

    it('rejects a string that is not valid JSON', () => {
      expect(() => normalizeDailyMeetingHours('not json', options)).toThrow(
        new ValidationError('La configuración de horarios no es válida.'),
      );
    });
  });

  describe('missing days', () => {
    it('demands every day when all of them are required', () => {
      const configured = [day('2026-11-03', { desde: '09:00', hasta: '12:00' })];

      expect(() => normalizeDailyMeetingHours(configured, options)).toThrow(
        /Debes configurar horarios de reunión para el día 2026-11-04/,
      );
    });

    it('fills a missing day with the default range when days are optional', () => {
      const configured = [day('2026-11-03', { desde: '09:00', hasta: '12:00' })];

      const result = normalizeDailyMeetingHours(configured, { ...options, allDaysRequired: false });

      expect(result[1]).toEqual({
        fecha: '2026-11-04',
        habilitado: true,
        rangos: [{ desde: '08:00', hasta: '18:00' }],
      });
    });

    it('ignores configured days outside the expected list', () => {
      const configured = [
        day('2026-11-03', { desde: '09:00', hasta: '12:00' }),
        day('2026-11-04', { desde: '09:00', hasta: '12:00' }),
        day('2026-12-25', { desde: '09:00', hasta: '12:00' }),
      ];

      expect(normalizeDailyMeetingHours(configured, options).map((d) => d.fecha)).toEqual(DATES);
    });
  });

  describe('disabled days', () => {
    it('keeps a disabled day with no ranges', () => {
      const configured = [
        { fecha: '2026-11-03', habilitado: false, rangos: [{ desde: '09:00', hasta: '12:00' }] },
        day('2026-11-04', { desde: '09:00', hasta: '12:00' }),
      ];

      expect(normalizeDailyMeetingHours(configured, options)[0]).toEqual({
        fecha: '2026-11-03',
        habilitado: false,
        rangos: [],
      });
    });

    it('treats a missing `habilitado` flag as enabled', () => {
      const configured = [
        { fecha: '2026-11-03', rangos: [{ desde: '09:00', hasta: '12:00' }] },
        day('2026-11-04', { desde: '09:00', hasta: '12:00' }),
      ];

      expect(normalizeDailyMeetingHours(configured, options)[0].habilitado).toBe(true);
    });

    it('rejects an enabled day with no ranges', () => {
      const configured = [day('2026-11-03'), day('2026-11-04', { desde: '09:00', hasta: '12:00' })];

      expect(() => normalizeDailyMeetingHours(configured, options)).toThrow(
        /Agrega al menos un rango para el día 2026-11-03/,
      );
    });
  });

  describe('ranges', () => {
    it('sorts ranges by start time', () => {
      const configured = [
        day('2026-11-03', { desde: '14:00', hasta: '16:00' }, { desde: '09:00', hasta: '12:00' }),
        day('2026-11-04', { desde: '09:00', hasta: '12:00' }),
      ];

      expect(normalizeDailyMeetingHours(configured, options)[0].rangos).toEqual([
        { desde: '09:00', hasta: '12:00' },
        { desde: '14:00', hasta: '16:00' },
      ]);
    });

    it('accepts 24:00 as a closing time', () => {
      const configured = [
        day('2026-11-03', { desde: '20:00', hasta: '24:00' }),
        day('2026-11-04', { desde: '09:00', hasta: '12:00' }),
      ];

      expect(normalizeDailyMeetingHours(configured, options)[0].rangos).toEqual([
        { desde: '20:00', hasta: '24:00' },
      ]);
    });

    it.each([
      ['a malformed hour', { desde: '9:00', hasta: '12:00' }],
      ['an hour past the clock', { desde: '25:00', hasta: '26:00' }],
      ['a malformed minute', { desde: '09:70', hasta: '12:00' }],
      ['an end before the start', { desde: '12:00', hasta: '09:00' }],
      ['an empty range', { desde: '10:00', hasta: '10:00' }],
    ])('rejects %s', (_case, rango) => {
      const configured = [day('2026-11-03', rango), day('2026-11-04', { desde: '09:00', hasta: '12:00' })];

      expect(() => normalizeDailyMeetingHours(configured, options)).toThrow(/no es válido/);
    });

    it('rejects overlapping ranges', () => {
      const configured = [
        day('2026-11-03', { desde: '09:00', hasta: '12:00' }, { desde: '11:00', hasta: '14:00' }),
        day('2026-11-04', { desde: '09:00', hasta: '12:00' }),
      ];

      expect(() => normalizeDailyMeetingHours(configured, options)).toThrow(
        /Los rangos del día 2026-11-03 no pueden superponerse/,
      );
    });

    it('accepts ranges that touch without overlapping', () => {
      const configured = [
        day('2026-11-03', { desde: '09:00', hasta: '12:00' }, { desde: '12:00', hasta: '14:00' }),
        day('2026-11-04', { desde: '09:00', hasta: '12:00' }),
      ];

      expect(normalizeDailyMeetingHours(configured, options)[0].rangos).toHaveLength(2);
    });
  });
});
