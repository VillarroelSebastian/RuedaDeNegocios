import type { SenderRole, StoredMessage } from '../services/message-thread.js';

/** A message as the conversation shows it. */
export interface MessageView {
  id: number;
  esMio: boolean;
  esStaff: boolean;
  contenido: string;
  /** Who wrote it: a person of the company, or a member of the team with their role. */
  autor: string | null;
  fecha: Date;
}

/** The counterpart of a conversation, as the list shows it. */
export interface CounterpartBrief {
  eeId: number;
  nombre: string;
  codigo: string | null;
  urlFotoPerfil: string | null;
}

export interface NewMessage {
  eventId: number;
  emisorEeId: number;
  receptorEeId: number;
  companyUserId: number | null;
  contenido: string;
  remitenteRol?: SenderRole;
  remitenteNombre?: string;
}

export interface MessagesRepositoryPort {
  findPrincipalEventId(): Promise<number | null>;
  /** An enrollment cleared to take part, which is who may be written to. */
  findGrantedEnrollment(companyEventId: number): Promise<{ id: number } | null>;
  /** The membership writing, only when it answers for the company. */
  findResponsibleMembership(
    companyUserId: number,
    companyEventId: number,
  ): Promise<{ id: number } | null>;

  listOf(companyEventId: number): Promise<StoredMessage[]>;
  /** Who the counterparts of a conversation list are. */
  findCounterparts(companyEventIds: number[]): Promise<CounterpartBrief[]>;
  listThread(
    companyEventId: number,
    otherId: number,
    limit: number,
  ): Promise<MessageView[]>;
  markThreadRead(companyEventId: number, otherId: number): Promise<void>;

  send(message: NewMessage): Promise<{ id: number; fecha: Date }>;
  companyNameOf(companyEventId: number): Promise<string | null>;
  /** The member of the team writing, and the role they sign with. */
  findStaffAuthor(userId: number): Promise<{ nombre: string; rolEvento: string } | null>;
}

export const MESSAGES_REPOSITORY = Symbol('MessagesRepositoryPort');
