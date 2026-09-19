import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  formatTimeOfDay,
  parseDateKey,
  parseTimeOfDay,
  sanitizeActivityDraft,
} from './activity-schedule.js';

const EVENT_DATES = ['2026-11-10', '2026-11-11', '2026-11-12'];

const DRAFT = {
  tipoActividad: 'Seminario',
  nombreActividad: '  Apertura  oficial ',
  descripcionActividad: ' Acto inaugural ',
  nombreSalaEspacio: ' Salón principal ',
  capacidadPersonasSala: 120,
  fechaActividad: '2026-11-10',
  horaInicioActividad: '09:00',
  horaFinActividad: '10:30',
};

describe('parseTimeOfDay', () => {
  it('reads a wall-clock label into the stored time of day', () => {
    expect(parseTimeOfDay('09:05').toISOString()).toBe('1970-01-01T09:05:00.000Z');
  });

  it('accepts a label that carries seconds', () => {
    expect(formatTimeOfDay(parseTimeOfDay('09:05:30'))).toBe('09:05');
  });

  it('refuses anything that is not a time of day', () => {
    expect(() => parseTimeOfDay('25:00')).toThrow(ValidationError);
    expect(() => parseTimeOfDay('9')).toThrow(ValidationError);
    expect(() => parseTimeOfDay('')).toThrow(ValidationError);
  });

  it('round-trips the label it was built from', () => {
    expect(formatTimeOfDay(parseTimeOfDay('18:45'))).toBe('18:45');
  });
});

describe('parseDateKey', () => {
  it('reads a calendar day without dragging a time zone in', () => {
    expect(parseDateKey('2026-11-10').toISOString()).toBe('2026-11-10T00:00:00.000Z');
  });

  it('refuses a day that is not one', () => {
    expect(() => parseDateKey('10/11/2026')).toThrow(ValidationError);
  });
});

describe('sanitizeActivityDraft', () => {
  it('collapses the whitespace of the text it stores', () => {
    const draft = sanitizeActivityDraft(DRAFT, EVENT_DATES);

    expect(draft.nombreActividad).toBe('Apertura oficial');
    expect(draft.descripcionActividad).toBe('Acto inaugural');
    expect(draft.nombreSalaEspacio).toBe('Salón principal');
  });

  it('keeps the schedule as a day and two times of day', () => {
    const draft = sanitizeActivityDraft(DRAFT, EVENT_DATES);

    expect(draft.fechaActividad.toISOString()).toBe('2026-11-10T00:00:00.000Z');
    expect(formatTimeOfDay(draft.horaInicioActividad)).toBe('09:00');
    expect(formatTimeOfDay(draft.horaFinActividad)).toBe('10:30');
  });

  it.each([
    ['nombreActividad', ''],
    ['descripcionActividad', '   '],
    ['nombreSalaEspacio', ''],
  ])('refuses a draft without %s', (field, value) => {
    expect(() => sanitizeActivityDraft({ ...DRAFT, [field]: value }, EVENT_DATES)).toThrow(
      'Nombre, descripción, sala, capacidad, fecha y horario son obligatorios',
    );
  });

  it('refuses a room that holds nobody', () => {
    expect(() =>
      sanitizeActivityDraft({ ...DRAFT, capacidadPersonasSala: 0 }, EVENT_DATES),
    ).toThrow('Nombre, descripción, sala, capacidad, fecha y horario son obligatorios');
  });

  it('refuses a day outside the event', () => {
    expect(() =>
      sanitizeActivityDraft({ ...DRAFT, fechaActividad: '2026-11-20' }, EVENT_DATES),
    ).toThrow('La fecha de la actividad debe estar dentro de las fechas del evento.');
  });

  it('accepts a day sent with a time attached', () => {
    const draft = sanitizeActivityDraft(
      { ...DRAFT, fechaActividad: '2026-11-11T00:00:00.000Z' },
      EVENT_DATES,
    );

    expect(draft.fechaActividad.toISOString()).toBe('2026-11-11T00:00:00.000Z');
  });

  // The legacy endpoint stored whatever it was given, so an activity could end
  // before it started and then rendered as a negative block in the programme.
  it('refuses an activity that ends before it starts', () => {
    expect(() =>
      sanitizeActivityDraft({ ...DRAFT, horaFinActividad: '08:00' }, EVENT_DATES),
    ).toThrow('La actividad debe terminar después de empezar.');
  });

  it('refuses an activity that ends exactly when it starts', () => {
    expect(() =>
      sanitizeActivityDraft({ ...DRAFT, horaFinActividad: '09:00' }, EVENT_DATES),
    ).toThrow(ValidationError);
  });

  it('defaults the programme state the legacy panel expects', () => {
    expect(sanitizeActivityDraft(DRAFT, EVENT_DATES).estadoActividad).toBe('Activo');
    expect(
      sanitizeActivityDraft({ ...DRAFT, estadoActividad: 'Cancelado' }, EVENT_DATES)
        .estadoActividad,
    ).toBe('Cancelado');
  });

  it('turns blank optional text into nothing stored', () => {
    const draft = sanitizeActivityDraft(
      { ...DRAFT, nombreCompletoPilaExpositor: '  ', linkReunionVirtual: '' },
      EVENT_DATES,
    );

    expect(draft.nombreCompletoPilaExpositor).toBeNull();
    expect(draft.linkReunionVirtual).toBeNull();
  });

  it('caps the text at the width of its column', () => {
    const draft = sanitizeActivityDraft(
      { ...DRAFT, nombreActividad: 'A'.repeat(300), descripcionActividad: 'B'.repeat(600) },
      EVENT_DATES,
    );

    expect(draft.nombreActividad).toHaveLength(255);
    expect(draft.descripcionActividad).toHaveLength(450);
  });

  it('refuses a capacity larger than the column holds', () => {
    expect(() =>
      sanitizeActivityDraft({ ...DRAFT, capacidadPersonasSala: 99_999 }, EVENT_DATES),
    ).toThrow(ValidationError);
  });

  it('refuses every day when the event declares none', () => {
    expect(() => sanitizeActivityDraft(DRAFT, [])).toThrow(
      'La fecha de la actividad debe estar dentro de las fechas del evento.',
    );
  });
});
