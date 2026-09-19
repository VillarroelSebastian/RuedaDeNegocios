import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';

/** The life of a meeting request: it is pending until somebody decides it. */
export const REQUEST_STATES = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'] as const;
export type RequestState = (typeof REQUEST_STATES)[number];

export const MEETING_TYPES = ['PRESENCIAL', 'VIRTUAL'] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

/** What every rule here needs to know about a request. */
export interface RequestParties {
  estadoSolicitud: string;
  solicitanteId: number;
  receptoraId: number;
}

const SETTLED = 'Solicitud no encontrada o ya procesada';
const FUTURE_WINDOW =
  'El horario de la reunión debe ser futuro y pertenecer al evento activo.';

/** Only a real string carries a value here; anything else reads as nothing. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeMeetingType(value: unknown): MeetingType {
  const tipo = text(value).toUpperCase() as MeetingType;
  if (!MEETING_TYPES.includes(tipo)) {
    throw new ValidationError('El tipo de reunión debe ser PRESENCIAL o VIRTUAL');
  }
  return tipo;
}

export function assertDifferentCompanies(solicitanteId: number, receptoraId: number): void {
  if (solicitanteId === receptoraId) {
    throw new ValidationError('No puedes solicitar una reunión contigo mismo');
  }
}

/**
 * The window a request proposes. It has to be in the future: a meeting nobody
 * can attend any more is not something the other company should have to decide.
 */
export function parseProposedWindow(inicio: unknown, fin: unknown, now: Date): TimeWindow {
  const start = new Date(text(inicio));
  const end = new Date(text(fin));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ValidationError(FUTURE_WINDOW);
  }
  if (end.getTime() <= start.getTime() || start.getTime() <= now.getTime()) {
    throw new ValidationError(FUTURE_WINDOW);
  }

  return { start, end };
}

/** A request that is no longer pending has already been decided by somebody. */
function assertPending(request: RequestParties): void {
  if (request.estadoSolicitud !== 'PENDIENTE') throw new ConflictError(SETTLED);
}

export function assertCanEdit(request: RequestParties, callerId: number): void {
  assertPending(request);
  if (request.solicitanteId !== callerId) {
    throw new ForbiddenError('Solo la empresa que envió la solicitud puede editarla');
  }
}

export function assertCanAccept(request: RequestParties, callerId: number): void {
  assertPending(request);
  if (request.receptoraId !== callerId) {
    throw new ForbiddenError('No tienes permiso para aceptar esta solicitud');
  }
}

export function assertCanReject(request: RequestParties, callerId: number): void {
  assertPending(request);
  if (request.receptoraId !== callerId) {
    throw new ForbiddenError('Solo la empresa receptora puede rechazar esta solicitud');
  }
}

export function assertCanCancel(request: RequestParties, callerId: number): void {
  assertPending(request);
  if (request.solicitanteId !== callerId) {
    throw new ForbiddenError('Solo la empresa solicitante puede cancelar esta solicitud');
  }
}
