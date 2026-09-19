import { EVENT_TIME_ZONE } from '../../../../shared/domain/bolivia-time.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/** How long before its hour a meeting may be started by mutual consent. */
export const EARLY_START_WINDOW_MINUTES = 10;

const MS_PER_MINUTE = 60_000;

export interface StartRequest {
  scheduledAt: Date;
  now: Date;
  /** The enrollment that already asked to start early, if any. */
  askedBy: number | null;
  /** The enrollment pressing the button now. */
  callerId: number;
}

export type StartPlan =
  | { accion: 'INICIAR' }
  | { accion: 'PEDIR'; solicitadoPor: number }
  | { accion: 'ESPERAR' };

/**
 * What pressing "start now" should do. Once the hour has come a single company
 * is enough. Before it, both have to agree: one asks and the other accepts by
 * pressing the same button, so nobody is pulled into a meeting early.
 */
export function planStart(request: StartRequest): StartPlan {
  if (request.now.getTime() >= request.scheduledAt.getTime()) return { accion: 'INICIAR' };

  const remaining = request.scheduledAt.getTime() - request.now.getTime();
  if (remaining > EARLY_START_WINDOW_MINUTES * MS_PER_MINUTE) {
    const hour = request.scheduledAt.toLocaleTimeString('es-BO', {
      timeZone: EVENT_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
    throw new ValidationError(
      `La reunión está programada para las ${hour}. Podrás solicitar el inicio anticipado ${EARLY_START_WINDOW_MINUTES} minutos antes.`,
    );
  }

  if (request.askedBy === null) return { accion: 'PEDIR', solicitadoPor: request.callerId };
  if (request.askedBy === request.callerId) return { accion: 'ESPERAR' };

  // The other company had already asked, so pressing now is the agreement.
  return { accion: 'INICIAR' };
}
