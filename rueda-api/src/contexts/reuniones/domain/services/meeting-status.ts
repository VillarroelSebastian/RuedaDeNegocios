import { ConflictError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/** The life of a meeting, from booked to over. */
export const MEETING_STATES = [
  'PROGRAMADA',
  'REPROGRAMADA',
  'EN_CURSO',
  'FINALIZADA',
  'CANCELADA',
] as const;

export type MeetingStatus = (typeof MEETING_STATES)[number];

/**
 * Where a meeting may go from where it is. A finished or cancelled meeting is
 * history: the legacy admin endpoint wrote any state it was handed, which is how
 * a finished meeting could be dragged back to booked and lose the hour it ran at.
 */
const TRANSITIONS: Record<MeetingStatus, MeetingStatus[]> = {
  PROGRAMADA: ['EN_CURSO', 'CANCELADA'],
  REPROGRAMADA: ['EN_CURSO', 'CANCELADA'],
  EN_CURSO: ['FINALIZADA'],
  FINALIZADA: [],
  CANCELADA: [],
};

/** States in which a meeting still occupies its table and its hour. */
const LIVE: string[] = ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'];

export function normalizeMeetingStatus(value: unknown): MeetingStatus {
  const status = (typeof value === 'string' ? value.trim().toUpperCase() : '') as MeetingStatus;
  if (!MEETING_STATES.includes(status)) {
    throw new ValidationError(
      'El estado de la reunión debe ser PROGRAMADA, REPROGRAMADA, EN_CURSO, FINALIZADA o CANCELADA.',
    );
  }
  return status;
}

export function assertTransition(from: string, to: string): void {
  const allowed = TRANSITIONS[from as MeetingStatus] ?? [];
  if (!allowed.includes(to as MeetingStatus)) {
    throw new ConflictError(`No se puede cambiar de ${from} a ${to}`);
  }
}

export function isLive(status: string): boolean {
  return LIVE.includes(status);
}
