import type {
  CounterpartBrief,
  MessageView,
  MessagesRepositoryPort,
  NewMessage,
} from './domain/ports/messages.repository.port.js';
import type { StoredMessage } from './domain/services/message-thread.js';

/**
 * In-memory doubles for the messaging context. They implement the port
 * literally so the use-case tests exercise real behaviour without a database.
 */

export const EVENT_ID = 7;
export const ME = 100;
export const THEM = 200;
export const MEMBERSHIP_ID = 500;
export const STAFF_USER_ID = 3;

export function buildStored(overrides: Partial<StoredMessage> = {}): StoredMessage {
  return {
    id: 1,
    emisorEeId: ME,
    receptorEeId: THEM,
    contenido: 'Hola',
    haSidoLeido: true,
    fechaCreacion: new Date('2026-11-10T12:00:00.000Z'),
    ...overrides,
  };
}

export interface FakeMessagesOptions {
  eventId?: number | null;
  stored?: StoredMessage[];
  counterparts?: CounterpartBrief[];
  thread?: MessageView[];
  enrollment?: { id: number } | null;
  membership?: { id: number } | null;
  companyName?: string | null;
  staffAuthor?: { nombre: string; rolEvento: string } | null;
}

export class FakeMessagesRepository implements MessagesRepositoryPort {
  readonly sent: NewMessage[] = [];
  readonly readThreads: { companyEventId: number; otherId: number }[] = [];

  constructor(private readonly options: FakeMessagesOptions = {}) {}

  async findPrincipalEventId(): Promise<number | null> {
    return this.options.eventId === undefined ? EVENT_ID : this.options.eventId;
  }

  async findGrantedEnrollment(companyEventId: number): Promise<{ id: number } | null> {
    return this.options.enrollment === undefined ? { id: companyEventId } : this.options.enrollment;
  }

  async findResponsibleMembership(): Promise<{ id: number } | null> {
    return this.options.membership === undefined ? { id: MEMBERSHIP_ID } : this.options.membership;
  }

  async listOf(): Promise<StoredMessage[]> {
    return this.options.stored ?? [];
  }

  async findCounterparts(): Promise<CounterpartBrief[]> {
    return (
      this.options.counterparts ?? [
        { eeId: THEM, nombre: 'Ganadera Beni', codigo: 'RB-GB-0002', urlFotoPerfil: null },
      ]
    );
  }

  async listThread(): Promise<MessageView[]> {
    return this.options.thread ?? [];
  }

  async markThreadRead(companyEventId: number, otherId: number): Promise<void> {
    this.readThreads.push({ companyEventId, otherId });
  }

  async send(message: NewMessage): Promise<{ id: number; fecha: Date }> {
    this.sent.push(message);
    return { id: 77, fecha: new Date('2026-11-10T13:00:00.000Z') };
  }

  async companyNameOf(): Promise<string | null> {
    return this.options.companyName === undefined ? 'Agro Beni' : this.options.companyName;
  }

  async findStaffAuthor(): Promise<{ nombre: string; rolEvento: string } | null> {
    return this.options.staffAuthor === undefined
      ? { nombre: 'Ana Perez', rolEvento: 'TECNICO_EVENTOS' }
      : this.options.staffAuthor;
  }
}
