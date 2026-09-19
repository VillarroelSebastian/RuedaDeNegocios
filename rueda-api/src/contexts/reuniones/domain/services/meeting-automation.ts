import { EVENT_TIME_ZONE } from '../../../../shared/domain/bolivia-time.js';

/**
 * What the event tells people on its own: the reminder before a meeting, the
 * warning that one is about to end, and the notice that one just started.
 *
 * The wording lives here, away from the timers that trigger it, so it can be
 * read and tested without waiting for a clock.
 */

/** Meetings that run over a video call, whatever else they also are. */
const REMOTE = new Set(['VIRTUAL', 'MIXTA']);

/** Warn once with a few minutes to go, and again when the end is imminent. */
const IMMINENT_MINUTES = 2;
const CLOSING_MINUTES = 5;

export function isRemote(tipoReunion: string): boolean {
  return REMOTE.has(tipoReunion);
}

/** The wall clock of the venue. An hour is read where the meeting happens. */
export function meetingClock(instant: Date): string {
  return instant.toLocaleTimeString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

/** Minutes still to run, rounded up: "0 minutes left" helps nobody. */
export function minutesLeft(now: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 60_000));
}

export interface ClosingNotice {
  tipo: string;
  titulo: string;
  mensaje: string;
}

/**
 * The warning that a meeting is about to end. Each threshold is its own kind of
 * notice, so the same meeting is announced once at five minutes and once at two
 * however often the timer runs in between.
 */
export function closingNotice(minutes: number): ClosingNotice {
  const threshold = minutes <= IMMINENT_MINUTES ? IMMINENT_MINUTES : CLOSING_MINUTES;

  return {
    tipo: `reunion:finaliza-${threshold}m`,
    titulo: threshold === IMMINENT_MINUTES ? 'La reunión está por terminar' : 'Quedan pocos minutos',
    mensaje: `Quedan aproximadamente ${minutes} minuto(s). Finaliza la reunión al concluir y registra la evaluación.`,
  };
}

export function reminderMessage(
  counterpart: string | null,
  start: Date,
  numeroMesa: number | null,
): string {
  const where = numeroMesa ? ` en la Mesa ${numeroMesa}` : '';

  return `Tu reunión con ${counterpart ?? 'la otra empresa'} comienza a las ${meetingClock(start)}${where}. ¡No llegues tarde!`;
}

export function startedMessage(tipoReunion: string): string {
  return isRemote(tipoReunion)
    ? 'La hora acordada llegó y tu reunión virtual comenzó. Abre esta notificación para acceder al enlace y unirte.'
    : 'La hora acordada llegó y tu reunión comenzó automáticamente.';
}

/** The standing notice that a virtual meeting still has nowhere to happen. */
export const MISSING_LINK_NOTICE = {
  tipo: 'staff:reunion-sin-enlace',
  titulo: 'Reunión virtual sin enlace',
  mensaje:
    'Hay una reunión virtual programada sin enlace. El equipo técnico debe agregarlo antes del inicio.',
} as const;

export function missingLinkSoonNotice(start: Date) {
  return {
    tipo: 'staff:reunion-sin-enlace-30m',
    titulo: 'URGENTE: agrega el enlace de la reunión virtual',
    mensaje: `La reunión virtual de las ${meetingClock(start)} comienza en menos de 30 minutos y aún no tiene enlace.`,
  };
}

export function teamsStartingNotice(start: Date) {
  return {
    tipo: 'staff:reunion-teams-iniciar',
    titulo: 'Inicia la sala de Microsoft Teams',
    mensaje: `La reunión de las ${meetingClock(start)} comienza en menos de 5 minutos. El técnico que agregó el enlace debe abrir Teams para admitir a las empresas.`,
  };
}

/** The meeting reached its hour and cannot start, because it has no link. */
export const MISSING_LINK_AT_START_NOTICE = {
  tipo: 'staff:reunion-sin-enlace-urgente',
  titulo: 'URGENTE: reunión virtual sin enlace',
  mensaje:
    'La reunión ya llegó a su hora de inicio y todavía no tiene enlace. Debe agregarse para poder iniciarla.',
} as const;

export const EVALUATION_NOTICE = {
  tipo: 'reunion:calificar',
  titulo: 'Califica tu reunión',
  mensaje:
    'Tu reunión terminó. Registra el resultado: calificación, rango de acuerdo y observaciones en la sección Resultados.',
} as const;
