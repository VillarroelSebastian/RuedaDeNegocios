import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_NOTIFIER_PORT,
  type CompanyNotifierPort,
} from '../../../../shared/application/ports/company-notifier.port.js';
import {
  REALTIME_PUBLISHER_PORT,
  type RealtimePublisherPort,
} from '../../../../shared/application/ports/realtime-publisher.port.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import {
  MESSAGES_REPOSITORY,
  type CounterpartBrief,
  type MessageView,
  type MessagesRepositoryPort,
} from '../../domain/ports/messages.repository.port.js';
import {
  EVENT_TEAM,
  assertCanSend,
  type Conversation,
  groupIntoConversations,
  sanitizeMessageBody,
  senderRoleOf,
} from '../../domain/services/message-thread.js';

/** A conversation shows what was said lately, not everything ever said. */
const THREAD_PAGE = 200;

const NO_EVENT = 'No hay un evento activo';
const NOT_ENROLLED = 'Empresa no habilitada o no pertenece al evento activo';
const TEAM_NAME = 'Equipo del evento';

export interface ConversationView extends Conversation {
  nombre: string;
  codigo: string | null;
  urlFotoPerfil: string | null;
}

/** Every counterpart the company has spoken to, latest first. */
@Injectable()
export class ListConversationsUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY) private readonly messages: MessagesRepositoryPort,
  ) {}

  async execute(companyEventId: number): Promise<ConversationView[]> {
    const conversations = groupIntoConversations(
      await this.messages.listOf(companyEventId),
      companyEventId,
    );

    const companies = await this.messages.findCounterparts(
      conversations.filter((one) => !one.esStaff).map((one) => one.eeId),
    );
    const byId = new Map<number, CounterpartBrief>(
      companies.map((company) => [company.eeId, company]),
    );

    return conversations.map((conversation) => {
      const company = byId.get(conversation.eeId);

      return {
        ...conversation,
        nombre: conversation.esStaff ? TEAM_NAME : (company?.nombre ?? 'Empresa'),
        codigo: conversation.esStaff ? null : (company?.codigo ?? null),
        urlFotoPerfil: conversation.esStaff ? null : (company?.urlFotoPerfil ?? null),
      };
    });
  }
}

@Injectable()
export class ReadThreadUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY) private readonly messages: MessagesRepositoryPort,
  ) {}

  execute(companyEventId: number, otherId: number): Promise<MessageView[]> {
    return this.messages.listThread(companyEventId, otherId, THREAD_PAGE);
  }
}

/**
 * Marks what arrived from one counterpart as read. It is its own operation
 * rather than a side effect of opening the thread, so reading never writes.
 */
@Injectable()
export class MarkThreadReadUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY) private readonly messages: MessagesRepositoryPort,
  ) {}

  async execute(companyEventId: number, otherId: number): Promise<void> {
    await this.messages.markThreadRead(companyEventId, otherId);
  }
}

export interface SendMessageCommand {
  /** The company writing, taken from its token. */
  emisorEeId: number;
  /** The membership writing, taken from its token. */
  companyUserId: number;
  receptorEeId: number;
  contenido: unknown;
}

@Injectable()
export class SendCompanyMessageUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY) private readonly messages: MessagesRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
    @Inject(REALTIME_PUBLISHER_PORT) private readonly realtime: RealtimePublisherPort,
  ) {}

  async execute(command: SendMessageCommand): Promise<{ id: number; fecha: Date }> {
    assertCanSend(command.emisorEeId, command.receptorEeId);
    const contenido = sanitizeMessageBody(command.contenido);

    const eventId = await this.messages.findPrincipalEventId();
    if (!eventId) throw new ValidationError(NO_EVENT);

    // Only the person answering for the company writes in its name.
    const membership = await this.messages.findResponsibleMembership(
      command.companyUserId,
      command.emisorEeId,
    );
    if (!membership) {
      throw new ForbiddenError('Solo el encargado de la empresa puede enviar mensajes');
    }

    const receiver = await this.messages.findGrantedEnrollment(command.receptorEeId);
    if (!receiver) throw new NotFoundError(NOT_ENROLLED);

    const sent = await this.messages.send({
      eventId,
      emisorEeId: command.emisorEeId,
      receptorEeId: command.receptorEeId,
      companyUserId: command.companyUserId,
      contenido,
    });

    const sender = await this.messages.companyNameOf(command.emisorEeId);
    await this.companies.notify({
      companyEventId: command.receptorEeId,
      tipo: 'mensaje:empresa',
      titulo: 'Nuevo mensaje',
      mensaje: `${sender ?? 'Otra empresa'} te envio un mensaje.`,
      referenciaId: sent.id,
      referenciaTabla: 'mensajeempresa',
    });
    // Its own event, so a conversation that is open refreshes at once.
    this.realtime.toCompanyEvent(command.receptorEeId, 'mensaje:nuevo', {
      deEeId: command.emisorEeId,
    });

    return sent;
  }
}

export interface SendStaffMessageCommand {
  /** The member of the team writing, taken from their token. */
  userId: number;
  receptorEeId: number;
  contenido: unknown;
}

/**
 * The event team writing to a company. It travels one way: the company sees it
 * as a conversation with the team, and has nobody to reply to.
 */
@Injectable()
export class SendStaffMessageUseCase {
  constructor(
    @Inject(MESSAGES_REPOSITORY) private readonly messages: MessagesRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
    @Inject(REALTIME_PUBLISHER_PORT) private readonly realtime: RealtimePublisherPort,
  ) {}

  async execute(command: SendStaffMessageCommand): Promise<{ id: number; fecha: Date }> {
    const contenido = sanitizeMessageBody(command.contenido);

    const eventId = await this.messages.findPrincipalEventId();
    if (!eventId) throw new ValidationError(NO_EVENT);

    const author = await this.messages.findStaffAuthor(command.userId);
    if (!author) throw new NotFoundError('Usuario no encontrado');
    const remitenteRol = senderRoleOf(author.rolEvento);

    const receiver = await this.messages.findGrantedEnrollment(command.receptorEeId);
    if (!receiver) throw new NotFoundError(NOT_ENROLLED);

    const sent = await this.messages.send({
      eventId,
      emisorEeId: EVENT_TEAM,
      receptorEeId: command.receptorEeId,
      companyUserId: null,
      contenido,
      remitenteRol,
      remitenteNombre: author.nombre,
    });

    await this.companies.notify({
      companyEventId: command.receptorEeId,
      tipo: 'mensaje:staff',
      titulo: 'Mensaje del equipo del evento',
      mensaje: contenido.slice(0, 200),
      referenciaId: sent.id,
      referenciaTabla: 'mensajeempresa',
    });
    this.realtime.toCompanyEvent(command.receptorEeId, 'mensaje:nuevo', { deEeId: EVENT_TEAM });

    return sent;
  }
}
