import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { ROLES } from '../../../../shared/domain/role.js';

/**
 * The event team writes as this sender. It is not a real enrollment: a company
 * sees those messages as one conversation with "Equipo del evento", and there
 * is nobody on the other side to reply to.
 */
export const EVENT_TEAM = 0;

/** `mensajeempresa.contenido` is a VarChar(1000). */
const MAX_LENGTH = 1000;

export type SenderRole = 'ADMIN' | 'TECNICO';

export interface StoredMessage {
  id: number;
  emisorEeId: number;
  receptorEeId: number;
  contenido: string;
  haSidoLeido: boolean;
  fechaCreacion: Date;
}

export interface Conversation {
  /** The counterpart, or `EVENT_TEAM` for the one-way team thread. */
  eeId: number;
  esStaff: boolean;
  ultimoMensaje: string;
  /** True when the latest message of the thread is one the caller sent. */
  esMio: boolean;
  fecha: Date;
  noLeidos: number;
}

export function sanitizeMessageBody(value: unknown): string {
  const body = (typeof value === 'string' ? value : '').trim().slice(0, MAX_LENGTH);
  if (!body) throw new ValidationError('El mensaje no puede estar vacío');

  return body;
}

export function assertCanSend(senderId: number, receiverId: number): void {
  if (senderId === receiverId) {
    throw new ValidationError('No puedes enviarte mensajes a tu propia empresa');
  }
  if (receiverId === EVENT_TEAM) {
    throw new ValidationError('No puedes responder a los mensajes del equipo del evento');
  }
}

/**
 * How a member of the team signs their message. Both technician roles write as
 * technicians: the legacy endpoint let only `TECNICO` through, so somebody with
 * `TECNICO_EVENTOS` could not message a company at all.
 */
export function senderRoleOf(role: string): SenderRole {
  if (role === ROLES.ADMIN) return 'ADMIN';
  if (role === ROLES.TECNICO || role === ROLES.TECNICO_EVENTOS) return 'TECNICO';

  throw new ValidationError('Solo administradores o técnicos pueden usar esta función');
}

/**
 * Turns a company's messages into one entry per counterpart: what was last
 * said, and how much of it is still waiting to be read.
 *
 * @param messages newest first, which is the order the latest message is taken from.
 */
export function groupIntoConversations(
  messages: StoredMessage[],
  companyEventId: number,
): Conversation[] {
  const byCounterpart = new Map<number, Conversation>();

  for (const message of messages) {
    const other =
      message.emisorEeId === companyEventId ? message.receptorEeId : message.emisorEeId;

    if (!byCounterpart.has(other)) {
      byCounterpart.set(other, {
        eeId: other,
        esStaff: other === EVENT_TEAM,
        ultimoMensaje: message.contenido,
        esMio: message.emisorEeId === companyEventId,
        fecha: message.fechaCreacion,
        noLeidos: 0,
      });
    }

    // Only what arrived can be unread; what the company sent never is.
    if (message.receptorEeId === companyEventId && !message.haSidoLeido) {
      byCounterpart.get(other)!.noLeidos += 1;
    }
  }

  return [...byCounterpart.values()].sort(
    (left, right) => right.fecha.getTime() - left.fecha.getTime(),
  );
}
