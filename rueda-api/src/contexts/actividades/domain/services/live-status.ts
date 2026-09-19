import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/**
 * What the staff moves during the event to reflect what is happening right now.
 * It is independent of `estadoActividad`, which describes the programme rather
 * than the current moment.
 */
export const LIVE_STATES = ['PENDIENTE', 'EN_VIVO', 'FINALIZADA'] as const;

export type LiveState = (typeof LIVE_STATES)[number];

/** `notaEnVivo` is a VarChar(305). */
const MAX_NOTE_LENGTH = 305;

export interface LiveStatusSource {
  estadoEnVivo: string;
  horaInicioReal: Date | null;
  horaFinReal: Date | null;
}

export interface LiveTransition {
  estadoEnVivo: LiveState;
  notaEnVivo: string | null;
  /** Set only when this is the stamp that has to be written for the first time. */
  horaInicioReal: Date | null;
  horaFinReal: Date | null;
  /** True only when the activity is entering live from another state. */
  notifySubscribers: boolean;
}

function isLiveState(value: string): value is LiveState {
  return (LIVE_STATES as readonly string[]).includes(value);
}

export function planLiveTransition(
  current: LiveStatusSource,
  requested: string,
  now: Date,
  note?: unknown,
): LiveTransition {
  const estadoEnVivo = String(requested ?? '').toUpperCase();
  if (!isLiveState(estadoEnVivo)) {
    throw new ValidationError('Estado inválido. Usa PENDIENTE, EN_VIVO o FINALIZADA.');
  }

  const trimmedNote = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE_LENGTH) : '';
  const enteringLive = estadoEnVivo === 'EN_VIVO' && current.estadoEnVivo !== 'EN_VIVO';

  return {
    estadoEnVivo,
    notaEnVivo: trimmedNote.length > 0 ? trimmedNote : null,
    // The real times are sealed once. An activity dragged back to live keeps the
    // hour it actually started at, which is what the report later reads.
    horaInicioReal: estadoEnVivo === 'EN_VIVO' && !current.horaInicioReal ? now : null,
    horaFinReal: estadoEnVivo === 'FINALIZADA' && !current.horaFinReal ? now : null,
    notifySubscribers: enteringLive,
  };
}
