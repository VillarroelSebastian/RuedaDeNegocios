import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { FakeRealtimePublisher } from '../../../noticias/test-doubles.js';
import { FakeCompanyNotifier } from '../../../pagos/test-doubles.js';
import { EVENT_TEAM } from '../../domain/services/message-thread.js';
import {
  EVENT_ID,
  FakeMessagesRepository,
  type FakeMessagesOptions,
  ME,
  MEMBERSHIP_ID,
  STAFF_USER_ID,
  THEM,
  buildStored,
} from '../../test-doubles.js';
import {
  ListConversationsUseCase,
  MarkThreadReadUseCase,
  ReadThreadUseCase,
  SendCompanyMessageUseCase,
  SendStaffMessageUseCase,
} from './messages.use-cases.js';

function build(options: FakeMessagesOptions = {}) {
  const repository = new FakeMessagesRepository(options);
  const companies = new FakeCompanyNotifier();
  const realtime = new FakeRealtimePublisher();

  return {
    repository,
    companies,
    realtime,
    conversations: new ListConversationsUseCase(repository),
    thread: new ReadThreadUseCase(repository),
    markRead: new MarkThreadReadUseCase(repository),
    send: new SendCompanyMessageUseCase(repository, companies, realtime),
    sendStaff: new SendStaffMessageUseCase(repository, companies, realtime),
  };
}

describe('ListConversationsUseCase', () => {
  it('names the counterpart of each conversation', async () => {
    const { conversations } = build({ stored: [buildStored()] });

    const list = await conversations.execute(ME);

    expect(list[0]).toMatchObject({
      eeId: THEM,
      nombre: 'Ganadera Beni',
      codigo: 'RB-GB-0002',
      esStaff: false,
    });
  });

  it('names the event team thread without looking for a company', async () => {
    const { conversations } = build({
      stored: [buildStored({ emisorEeId: EVENT_TEAM, receptorEeId: ME })],
      counterparts: [],
    });

    const list = await conversations.execute(ME);

    expect(list[0]).toMatchObject({
      eeId: EVENT_TEAM,
      nombre: 'Equipo del evento',
      esStaff: true,
      codigo: null,
    });
  });

  it('falls back to a plain name when the company is gone', async () => {
    const { conversations } = build({ stored: [buildStored()], counterparts: [] });

    expect((await conversations.execute(ME))[0].nombre).toBe('Empresa');
  });

  it('answers with nothing when nobody wrote', async () => {
    const { conversations } = build({ stored: [] });

    expect(await conversations.execute(ME)).toEqual([]);
  });
});

describe('MarkThreadReadUseCase', () => {
  /** Reading a thread never writes; marking it read is its own operation. */
  it('marks what arrived from one counterpart as read', async () => {
    const { markRead, repository } = build();

    await markRead.execute(ME, THEM);

    expect(repository.readThreads).toEqual([{ companyEventId: ME, otherId: THEM }]);
  });
});

describe('ReadThreadUseCase', () => {
  it('reads without marking anything', async () => {
    const { thread, repository } = build({ thread: [] });

    await thread.execute(ME, THEM);

    expect(repository.readThreads).toEqual([]);
  });
});

describe('SendCompanyMessageUseCase', () => {
  const command = {
    emisorEeId: ME,
    companyUserId: MEMBERSHIP_ID,
    receptorEeId: THEM,
    contenido: '  Hola  ',
  };

  it('stores the message and tells the other company', async () => {
    const { send, repository, companies, realtime } = build();

    const sent = await send.execute(command);

    expect(sent.id).toBe(77);
    expect(repository.sent[0]).toMatchObject({
      eventId: EVENT_ID,
      emisorEeId: ME,
      receptorEeId: THEM,
      contenido: 'Hola',
    });
    expect(companies.sent[0]?.tipo).toBe('mensaje:empresa');
    expect(companies.sent[0]?.mensaje).toContain('Agro Beni');
    expect(realtime.toCompanyEvents[0]).toMatchObject({
      companyEventId: THEM,
      event: 'mensaje:nuevo',
    });
  });

  /** Writing in the name of a company is the job of whoever answers for it. */
  it('refuses somebody who does not answer for the company', async () => {
    const { send } = build({ membership: null });

    await expect(send.execute(command)).rejects.toThrow(
      'Solo el encargado de la empresa puede enviar mensajes',
    );
  });

  it('refuses a company writing to itself', async () => {
    const { send } = build();

    await expect(send.execute({ ...command, receptorEeId: ME })).rejects.toThrow(
      'No puedes enviarte mensajes a tu propia empresa',
    );
  });

  it('refuses replying to the event team', async () => {
    const { send } = build();

    await expect(send.execute({ ...command, receptorEeId: EVENT_TEAM })).rejects.toThrow(
      ValidationError,
    );
  });

  it('refuses an empty message', async () => {
    const { send } = build();

    await expect(send.execute({ ...command, contenido: '   ' })).rejects.toThrow(
      'El mensaje no puede estar vacío',
    );
  });

  it('refuses a company that is not cleared to take part', async () => {
    const { send } = build({ enrollment: null });

    await expect(send.execute(command)).rejects.toThrow(NotFoundError);
  });

  it('refuses while no event is running', async () => {
    const { send } = build({ eventId: null });

    await expect(send.execute(command)).rejects.toThrow('No hay un evento activo');
  });
});

describe('SendStaffMessageUseCase', () => {
  const command = { userId: STAFF_USER_ID, receptorEeId: THEM, contenido: 'Pasen a la mesa 3' };

  it('writes as the event team, signed by whoever wrote it', async () => {
    const { sendStaff, repository, companies } = build();

    await sendStaff.execute(command);

    expect(repository.sent[0]).toMatchObject({
      emisorEeId: EVENT_TEAM,
      companyUserId: null,
      remitenteRol: 'TECNICO',
      remitenteNombre: 'Ana Perez',
    });
    expect(companies.sent[0]?.tipo).toBe('mensaje:staff');
  });

  it('signs an administrator as the organisation', async () => {
    const { sendStaff, repository } = build({
      staffAuthor: { nombre: 'Luis Gomez', rolEvento: 'ADMINISTRADOR' },
    });

    await sendStaff.execute(command);

    expect(repository.sent[0]?.remitenteRol).toBe('ADMIN');
  });

  it('refuses somebody who is not on the team', async () => {
    const { sendStaff } = build({
      staffAuthor: { nombre: 'Ana Perez', rolEvento: 'EMPRESA' },
    });

    await expect(sendStaff.execute(command)).rejects.toThrow(
      'Solo administradores o técnicos pueden usar esta función',
    );
  });

  it('refuses an author that is not there', async () => {
    const { sendStaff } = build({ staffAuthor: null });

    await expect(sendStaff.execute(command)).rejects.toThrow('Usuario no encontrado');
  });

  it('refuses a company that is not cleared to take part', async () => {
    const { sendStaff } = build({ enrollment: null });

    await expect(sendStaff.execute(command)).rejects.toThrow(NotFoundError);
  });
});
