import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { buildEventSettings, parseBoliviaInstant } from './event-settings.js';

const BASE = {
  nombre: 'Rueda de Negocios',
  fechaInicioEvento: '2026-11-03T08:00',
  fechaFinEvento: '2026-11-04T18:00',
};

describe('parseBoliviaInstant', () => {
  it('reads a datetime-local value as Bolivian wall-clock time', () => {
    expect(parseBoliviaInstant('2026-11-03T08:00').toISOString()).toBe('2026-11-03T12:00:00.000Z');
  });

  it('accepts seconds in the datetime-local value', () => {
    expect(parseBoliviaInstant('2026-11-03T08:00:30').toISOString()).toBe(
      '2026-11-03T12:00:30.000Z',
    );
  });

  it('respects an explicit offset instead of forcing Bolivia', () => {
    expect(parseBoliviaInstant('2026-11-03T08:00:00Z').toISOString()).toBe(
      '2026-11-03T08:00:00.000Z',
    );
  });
});

describe('buildEventSettings', () => {
  describe('dates', () => {
    it('interprets the event dates in Bolivian time', () => {
      const settings = buildEventSettings(BASE);

      expect(settings.fechaInicioEvento.toISOString()).toBe('2026-11-03T12:00:00.000Z');
      expect(settings.fechaFinEvento.toISOString()).toBe('2026-11-04T22:00:00.000Z');
    });

    it('leaves the registration period null when it is not supplied', () => {
      const settings = buildEventSettings(BASE);

      expect(settings.fechaInicioSolicitudes).toBeNull();
      expect(settings.fechaFinSolicitudes).toBeNull();
    });

    it('rejects a registration period that closes before it opens', () => {
      expect(() =>
        buildEventSettings({
          ...BASE,
          fechaInicioSolicitudes: '2026-10-20T10:00',
          fechaFinSolicitudes: '2026-10-19T10:00',
        }),
      ).toThrow(
        new ValidationError(
          'El inicio del período de inscripciones debe ser anterior a su fecha límite.',
        ),
      );
    });

    it('rejects a registration period that opens and closes at the same instant', () => {
      expect(() =>
        buildEventSettings({
          ...BASE,
          fechaInicioSolicitudes: '2026-10-20T10:00',
          fechaFinSolicitudes: '2026-10-20T10:00',
        }),
      ).toThrow(/anterior a su fecha límite/);
    });
  });

  describe('numeric defaults', () => {
    it('applies the defaults of the legacy admin form', () => {
      const settings = buildEventSettings(BASE);

      expect(settings).toMatchObject({
        duracionReunion: 20,
        tiempoEntreReuniones: 5,
        cantidadTotalMesasEvento: 50,
        capacidadPersonasPorMesa: 4,
        montoBaseIncripcionBolivianos: 500,
        cantidadParticipantesIncluidos: 2,
        costoParticipanteExtra: 100,
        maxParticipantesPorEmpresa: 5,
      });
    });

    it('keeps supplied numbers', () => {
      const settings = buildEventSettings({ ...BASE, duracionReunion: 30, cantidadTotalMesasEvento: 80 });

      expect(settings.duracionReunion).toBe(30);
      expect(settings.cantidadTotalMesasEvento).toBe(80);
    });

    it('falls back to the default when a number arrives as zero or unparsable', () => {
      const settings = buildEventSettings({ ...BASE, duracionReunion: 0, capacidadPersonasPorMesa: 'x' });

      expect(settings.duracionReunion).toBe(20);
      expect(settings.capacidadPersonasPorMesa).toBe(4);
    });
  });

  describe('optional text', () => {
    it('stores an empty string as null', () => {
      const settings = buildEventSettings({ ...BASE, descripcion: '', ciudadEvento: 'Trinidad' });

      expect(settings.descripcion).toBeNull();
      expect(settings.ciudadEvento).toBe('Trinidad');
    });

    it('defaults the edition to an empty string rather than null', () => {
      expect(buildEventSettings(BASE).edicion).toBe('');
    });
  });

  describe('meeting logistics', () => {
    it('omits the logistics when they are not part of the request', () => {
      expect(buildEventSettings(BASE).horariosReunionJson).toBeUndefined();
    });

    it('serialises the normalised logistics', () => {
      const settings = buildEventSettings({
        ...BASE,
        horariosReunion: [
          { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
          { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
        ],
      });

      expect(JSON.parse(settings.horariosReunionJson!)).toEqual([
        { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
        { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
      ]);
    });

    it('refuses to disable a day of the event', () => {
      expect(() =>
        buildEventSettings({
          ...BASE,
          horariosReunion: [
            { fecha: '2026-11-03', habilitado: false, rangos: [] },
            { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
          ],
        }),
      ).toThrow(/Todos los días del evento deben tener al menos un horario de reuniones/);
    });

    it('refuses a range that starts before the configured working day', () => {
      expect(() =>
        buildEventSettings({
          ...BASE,
          horariosReunion: [
            { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '06:00', hasta: '12:00' }] },
            { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
          ],
        }),
      ).toThrow(/dentro del día configurado para la logística/);
    });

    it('refuses a range that ends after the configured working day', () => {
      expect(() =>
        buildEventSettings({
          ...BASE,
          horariosReunion: [
            { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '09:00', hasta: '20:00' }] },
            { fecha: '2026-11-04', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
          ],
        }),
      ).toThrow(/dentro del día configurado para la logística/);
    });

    it('opens the whole day when a registration period drives the logistics', () => {
      const settings = buildEventSettings({
        ...BASE,
        fechaInicioSolicitudes: '2026-10-20T10:00',
        fechaFinSolicitudes: '2026-10-21T10:00',
        horariosReunion: [
          { fecha: '2026-10-20', habilitado: true, rangos: [{ desde: '00:00', hasta: '24:00' }] },
          { fecha: '2026-10-21', habilitado: true, rangos: [{ desde: '00:00', hasta: '24:00' }] },
        ],
      });

      expect(JSON.parse(settings.horariosReunionJson!)).toHaveLength(2);
    });
  });
});
