import { boliviaHourMinute } from '../../../../shared/domain/bolivia-time.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { meetingDates, meetingWindow } from './event-schedule.js';
import { normalizeDailyMeetingHours } from './meeting-hours.js';

/** Raw event form input, before validation. */
export interface EventSettingsInput {
  nombre: string;
  edicion?: string;
  descripcion?: string | null;
  fechaInicioEvento?: string | Date;
  fechaFinEvento?: string | Date;
  fechaInicioSolicitudes?: string | Date | null;
  fechaFinSolicitudes?: string | Date | null;
  horariosReunion?: unknown;
  duracionReunion?: unknown;
  tiempoEntreReuniones?: unknown;
  cantidadTotalMesasEvento?: unknown;
  capacidadPersonasPorMesa?: unknown;
  montoBaseIncripcionBolivianos?: unknown;
  cantidadParticipantesIncluidos?: unknown;
  costoParticipanteExtra?: unknown;
  maxParticipantesPorEmpresa?: unknown;
  urlImagenMapaRecinto?: string | null;
  urlImagenCronogramaCharlas?: string | null;
  urlLogoEvento?: string | null;
  sobreElEvento?: string | null;
  urlVideoEvento?: string | null;
  pilaresEvento?: string | null;
  correoContacto?: string | null;
  telefonoContacto?: string | null;
  enlaceFacebook?: string | null;
  enlaceInstagram?: string | null;
  enlaceLinkedIn?: string | null;
  enlaceTiktok?: string | null;
  ciudadEvento?: string | null;
  paisEvento?: string | null;
}

export interface EventSettings {
  nombre: string;
  edicion: string;
  descripcion: string | null;
  fechaInicioEvento: Date;
  fechaFinEvento: Date;
  fechaInicioSolicitudes: Date | null;
  fechaFinSolicitudes: Date | null;
  duracionReunion: number;
  tiempoEntreReuniones: number;
  /** Absent when the request did not touch the logistics. */
  horariosReunionJson?: string;
  cantidadTotalMesasEvento: number;
  capacidadPersonasPorMesa: number;
  montoBaseIncripcionBolivianos: number;
  cantidadParticipantesIncluidos: number;
  costoParticipanteExtra: number;
  maxParticipantesPorEmpresa: number;
  urlImagenMapaRecinto: string | null;
  urlImagenCronogramaCharlas: string | null;
  urlLogoEvento: string | null;
  sobreElEvento: string | null;
  urlVideoEvento: string | null;
  pilaresEvento: string | null;
  correoContacto: string | null;
  telefonoContacto: string | null;
  enlaceFacebook: string | null;
  enlaceInstagram: string | null;
  enlaceLinkedIn: string | null;
  enlaceTiktok: string | null;
  ciudadEvento: string | null;
  paisEvento: string | null;
}

/** `datetime-local` carries no zone, so a bare value is read as Bolivian time. */
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export function parseBoliviaInstant(value: string | Date | null | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;

  const text = String(value);
  return new Date(LOCAL_DATETIME.test(text) ? `${text}-04:00` : text);
}

/** Validates and normalises the administrator's event form into stored settings. */
export function buildEventSettings(input: EventSettingsInput): EventSettings {
  const fechaInicioEvento = parseBoliviaInstant(input.fechaInicioEvento);
  const fechaFinEvento = parseBoliviaInstant(input.fechaFinEvento);
  const fechaInicioSolicitudes = input.fechaInicioSolicitudes
    ? parseBoliviaInstant(input.fechaInicioSolicitudes)
    : null;
  const fechaFinSolicitudes = input.fechaFinSolicitudes
    ? parseBoliviaInstant(input.fechaFinSolicitudes)
    : null;

  if (
    fechaInicioSolicitudes &&
    fechaFinSolicitudes &&
    fechaInicioSolicitudes >= fechaFinSolicitudes
  ) {
    throw new ValidationError(
      'El inicio del período de inscripciones debe ser anterior a su fecha límite.',
    );
  }

  const horariosReunionJson = buildMeetingHoursJson(input, {
    startsAt: fechaInicioEvento,
    endsAt: fechaFinEvento,
    registrationStartsAt: fechaInicioSolicitudes,
    registrationEndsAt: fechaFinSolicitudes,
    meetingHoursJson: null,
  });

  return {
    nombre: input.nombre,
    edicion: input.edicion || '',
    descripcion: orNull(input.descripcion),
    fechaInicioEvento,
    fechaFinEvento,
    fechaInicioSolicitudes,
    fechaFinSolicitudes,
    duracionReunion: numberOr(input.duracionReunion, 20),
    tiempoEntreReuniones: numberOr(input.tiempoEntreReuniones, 5),
    ...(horariosReunionJson !== undefined ? { horariosReunionJson } : {}),
    cantidadTotalMesasEvento: numberOr(input.cantidadTotalMesasEvento, 50),
    capacidadPersonasPorMesa: numberOr(input.capacidadPersonasPorMesa, 4),
    montoBaseIncripcionBolivianos: numberOr(input.montoBaseIncripcionBolivianos, 500),
    cantidadParticipantesIncluidos: numberOr(input.cantidadParticipantesIncluidos, 2),
    costoParticipanteExtra: numberOr(input.costoParticipanteExtra, 100),
    maxParticipantesPorEmpresa: numberOr(input.maxParticipantesPorEmpresa, 5),
    urlImagenMapaRecinto: orNull(input.urlImagenMapaRecinto),
    urlImagenCronogramaCharlas: orNull(input.urlImagenCronogramaCharlas),
    urlLogoEvento: orNull(input.urlLogoEvento),
    sobreElEvento: orNull(input.sobreElEvento),
    urlVideoEvento: orNull(input.urlVideoEvento),
    pilaresEvento: orNull(input.pilaresEvento),
    correoContacto: orNull(input.correoContacto),
    telefonoContacto: orNull(input.telefonoContacto),
    enlaceFacebook: orNull(input.enlaceFacebook),
    enlaceInstagram: orNull(input.enlaceInstagram),
    enlaceLinkedIn: orNull(input.enlaceLinkedIn),
    enlaceTiktok: orNull(input.enlaceTiktok),
    ciudadEvento: orNull(input.ciudadEvento),
    paisEvento: orNull(input.paisEvento),
  };
}

interface ScheduleProjection {
  startsAt: Date;
  endsAt: Date;
  registrationStartsAt: Date | null;
  registrationEndsAt: Date | null;
  meetingHoursJson: string | null;
}

function buildMeetingHoursJson(
  input: EventSettingsInput,
  schedule: ScheduleProjection,
): string | undefined {
  if (input.horariosReunion === undefined) return undefined;

  const window = meetingWindow(schedule);
  const usesRegistrationPeriod = Boolean(
    schedule.registrationStartsAt && schedule.registrationEndsAt,
  );

  // A registration-driven event opens the whole day; otherwise the working day
  // is taken from the event window itself.
  const from = usesRegistrationPeriod ? '00:00' : boliviaHourMinute(window.start).hhmm;
  const endParts = boliviaHourMinute(window.end);
  const to =
    usesRegistrationPeriod || (endParts.hour === 0 && endParts.minute === 0)
      ? '24:00'
      : endParts.hhmm;

  const days = normalizeDailyMeetingHours(input.horariosReunion, {
    dates: meetingDates(schedule),
    defaultFrom: from,
    defaultTo: to,
    allDaysRequired: true,
  });

  if (days.some((day) => !day.habilitado)) {
    throw new ValidationError(
      'Todos los días del evento deben tener al menos un horario de reuniones.',
    );
  }
  if (days.some((day) => day.rangos.some((range) => range.desde < from || range.hasta > to))) {
    throw new ValidationError(
      'Los horarios de reuniones deben estar dentro del día configurado para la logística.',
    );
  }

  return JSON.stringify(days);
}

function orNull(value: string | null | undefined): string | null {
  return value === '' || value === undefined ? null : value;
}

function numberOr(value: unknown, fallback: number): number {
  return Number(value) || fallback;
}
