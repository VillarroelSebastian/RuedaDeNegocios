import type { DateKey } from '../../../../shared/domain/bolivia-time.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/**
 * An activity of the programme is scheduled as a calendar day plus two times of
 * day. Neither is an instant: `09:00` is what the sign on the room says, the
 * same label for everyone reading it. Both are therefore stored and read in UTC,
 * so the value never shifts with the time zone of whatever machine touches it.
 */

const DATE_KEY_SHAPE = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME_SHAPE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
const MINUTES_PER_DAY = 24 * 60;

const REQUIRED_FIELDS_MESSAGE =
  'Nombre, descripción, sala, capacidad, fecha y horario son obligatorios';

/** `capacidadPersonasSala` is a SmallInt. */
const MAX_CAPACITY = 32_767;

/** Column widths of `actividadprograma`. */
const MAX = {
  tipoActividad: 45,
  nombreActividad: 255,
  descripcionActividad: 450,
  nombreSalaEspacio: 155,
  nombreCompletoPilaExpositor: 450,
  organizacionDelExpositor: 150,
  urlImagenBannerActividad: 505,
  estadoActividad: 45,
  linkReunionVirtual: 505,
  direccionTexto: 205,
  ubicacionGoogleMapsPresencial: 505,
} as const;

const DEFAULT_STATE = 'Activo';
const DEFAULT_TYPE = 'Actividad';

export interface ActivityDraftInput {
  tipoActividad?: unknown;
  nombreActividad?: unknown;
  descripcionActividad?: unknown;
  nombreSalaEspacio?: unknown;
  capacidadPersonasSala?: unknown;
  fechaActividad?: unknown;
  horaInicioActividad?: unknown;
  horaFinActividad?: unknown;
  nombreCompletoPilaExpositor?: unknown;
  organizacionDelExpositor?: unknown;
  urlImagenBannerActividad?: unknown;
  estadoActividad?: unknown;
  linkReunionVirtual?: unknown;
  direccionTexto?: unknown;
  ubicacionGoogleMapsPresencial?: unknown;
}

export interface ActivityDraft {
  tipoActividad: string;
  nombreActividad: string;
  descripcionActividad: string;
  nombreSalaEspacio: string;
  capacidadPersonasSala: number;
  fechaActividad: Date;
  horaInicioActividad: Date;
  horaFinActividad: Date;
  nombreCompletoPilaExpositor: string | null;
  organizacionDelExpositor: string | null;
  urlImagenBannerActividad: string | null;
  estadoActividad: string;
  linkReunionVirtual: string | null;
  direccionTexto: string | null;
  ubicacionGoogleMapsPresencial: string | null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function optionalText(value: unknown, maxLength: number): string | null {
  const trimmed = text(value).slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

/** `2026-11-10` and `2026-11-10T00:00:00.000Z` are the same day. */
export function parseDateKey(value: unknown): Date {
  const match = DATE_KEY_SHAPE.exec(typeof value === 'string' ? value : '');
  if (!match) throw new ValidationError(REQUIRED_FIELDS_MESSAGE);

  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

export function dateKeyOf(stored: Date): DateKey {
  return stored.toISOString().slice(0, 10);
}

export function parseTimeOfDay(value: unknown): Date {
  const match = TIME_SHAPE.exec(typeof value === 'string' ? value.trim() : '');
  if (!match) throw new ValidationError('El horario debe tener la forma HH:MM.');

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new ValidationError('El horario debe tener la forma HH:MM.');
  }

  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0, 0));
}

/** `HH:MM`, which is how the API hands a time of day to its clients. */
export function formatTimeOfDay(stored: Date): string {
  const hour = String(stored.getUTCHours()).padStart(2, '0');
  const minute = String(stored.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function minutesOf(timeOfDay: Date): number {
  return timeOfDay.getUTCHours() * 60 + timeOfDay.getUTCMinutes();
}

export function sanitizeActivityDraft(
  input: ActivityDraftInput,
  eventDates: DateKey[],
): ActivityDraft {
  const nombreActividad = text(input.nombreActividad).slice(0, MAX.nombreActividad);
  const descripcionActividad = text(input.descripcionActividad).slice(
    0,
    MAX.descripcionActividad,
  );
  const nombreSalaEspacio = text(input.nombreSalaEspacio).slice(0, MAX.nombreSalaEspacio);
  const capacidadPersonasSala = Number(input.capacidadPersonasSala);

  if (
    !nombreActividad ||
    !descripcionActividad ||
    !nombreSalaEspacio ||
    !Number.isInteger(capacidadPersonasSala) ||
    capacidadPersonasSala <= 0
  ) {
    throw new ValidationError(REQUIRED_FIELDS_MESSAGE);
  }
  if (capacidadPersonasSala > MAX_CAPACITY) {
    throw new ValidationError(`La capacidad de la sala no puede superar ${MAX_CAPACITY}.`);
  }

  const fechaActividad = parseDateKey(input.fechaActividad);
  if (!eventDates.includes(dateKeyOf(fechaActividad))) {
    throw new ValidationError(
      'La fecha de la actividad debe estar dentro de las fechas del evento.',
    );
  }

  const horaInicioActividad = parseTimeOfDay(input.horaInicioActividad);
  const horaFinActividad = parseTimeOfDay(input.horaFinActividad);
  const span = minutesOf(horaFinActividad) - minutesOf(horaInicioActividad);
  if (span <= 0 || span >= MINUTES_PER_DAY) {
    throw new ValidationError('La actividad debe terminar después de empezar.');
  }

  return {
    tipoActividad: text(input.tipoActividad).slice(0, MAX.tipoActividad) || DEFAULT_TYPE,
    nombreActividad,
    descripcionActividad,
    nombreSalaEspacio,
    capacidadPersonasSala,
    fechaActividad,
    horaInicioActividad,
    horaFinActividad,
    nombreCompletoPilaExpositor: optionalText(
      input.nombreCompletoPilaExpositor,
      MAX.nombreCompletoPilaExpositor,
    ),
    organizacionDelExpositor: optionalText(
      input.organizacionDelExpositor,
      MAX.organizacionDelExpositor,
    ),
    urlImagenBannerActividad: optionalText(
      input.urlImagenBannerActividad,
      MAX.urlImagenBannerActividad,
    ),
    estadoActividad: text(input.estadoActividad).slice(0, MAX.estadoActividad) || DEFAULT_STATE,
    linkReunionVirtual: optionalText(input.linkReunionVirtual, MAX.linkReunionVirtual),
    direccionTexto: optionalText(input.direccionTexto, MAX.direccionTexto),
    ubicacionGoogleMapsPresencial: optionalText(
      input.ubicacionGoogleMapsPresencial,
      MAX.ubicacionGoogleMapsPresencial,
    ),
  };
}
