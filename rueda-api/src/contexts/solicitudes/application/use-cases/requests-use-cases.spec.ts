import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FixedClock } from '../../../auth/test-doubles.js';
import { FakeCompanyNotifier } from '../../../pagos/test-doubles.js';
import {
  EVENT,
  FakeMeetingRequestsRepository,
  type FakeRequestsOptions,
  FakeSlotAvailability,
  FakeStaffNotifier,
  FakeTableAllocation,
  MEMBERSHIP_ID,
  RECEIVER_ID,
  SENDER_ID,
  SLOT_END,
  SLOT_START,
  buildRequest,
} from '../../test-doubles.js';
import { ListMeetingRequestsUseCase } from './list-requests.use-case.js';
import {
  AcceptMeetingRequestUseCase,
  CancelMeetingRequestUseCase,
  CreateMeetingRequestUseCase,
  EditMeetingRequestUseCase,
  RejectMeetingRequestUseCase,
} from './manage-requests.use-cases.js';

/** Before the first slot, so a proposed window is still in the future. */
const NOW = new Date('2026-11-10T10:00:00.000Z');

function build(
  options: FakeRequestsOptions = {},
  table: { picked?: number | null; free?: boolean } = {},
  slotAvailable = true,
) {
  const repository = new FakeMeetingRequestsRepository(options);
  const tables = new FakeTableAllocation(table);
  const availability = new FakeSlotAvailability(slotAvailable);
  const companies = new FakeCompanyNotifier();
  const staff = new FakeStaffNotifier();
  const clock = new FixedClock(NOW);

  return {
    repository,
    tables,
    availability,
    companies,
    staff,
    create: new CreateMeetingRequestUseCase(repository, tables, availability, clock, companies),
    edit: new EditMeetingRequestUseCase(repository, tables, availability, clock, companies),
    accept: new AcceptMeetingRequestUseCase(repository, tables, clock, companies, staff),
    reject: new RejectMeetingRequestUseCase(repository, companies),
    cancel: new CancelMeetingRequestUseCase(repository, companies),
    list: new ListMeetingRequestsUseCase(repository),
  };
}

function createCommand(overrides: Record<string, unknown> = {}) {
  return {
    solicitanteId: SENDER_ID,
    companyUserId: MEMBERSHIP_ID,
    receptoraId: RECEIVER_ID,
    tipo: 'PRESENCIAL',
    inicio: SLOT_START,
    fin: SLOT_END,
    ...overrides,
  };
}

describe('CreateMeetingRequestUseCase', () => {
  it('stores the request and tells the other company', async () => {
    const { create, repository, companies } = build();

    const created = await create.execute(createCommand({ mensaje: '  Hola  ' }));

    expect(created.id).toBe(99);
    expect(repository.created[0]?.mensaje).toBe('Hola');
    expect(companies.sent[0]?.tipo).toBe('solicitud:nueva');
    expect(companies.sent[0]?.companyEventId).toBe(RECEIVER_ID);
  });

  it('names the company that is asking in the notice', async () => {
    const { create, companies } = build({ companyName: 'Agro Beni' });

    await create.execute(createCommand());

    expect(companies.sent[0]?.mensaje).toContain('Agro Beni');
  });

  it('picks a table for a face to face meeting when none was chosen', async () => {
    const { create, repository } = build({}, { picked: 4 });

    await create.execute(createCommand({ mesaId: undefined }));

    expect(repository.created[0]?.mesaId).toBe(4);
  });

  it('keeps the table the company chose when it is still free', async () => {
    const { create, repository } = build({}, { free: true });

    await create.execute(createCommand({ mesaId: 9 }));

    expect(repository.created[0]?.mesaId).toBe(9);
  });

  it('takes no table for a virtual meeting', async () => {
    const { create, repository } = build();

    await create.execute(createCommand({ tipo: 'VIRTUAL', mesaId: 9 }));

    expect(repository.created[0]?.mesaId).toBeNull();
  });

  it('refuses when the floor has no free table', async () => {
    const { create } = build({}, { picked: null });

    await expect(create.execute(createCommand())).rejects.toThrow(
      'No hay mesas disponibles para ese horario',
    );
  });

  it('refuses a table that is no longer bookable', async () => {
    const { create } = build({}, { free: false });

    await expect(create.execute(createCommand({ mesaId: 9 }))).rejects.toThrow(
      'La mesa seleccionada no pertenece al evento activo o ya no está habilitada.',
    );
  });

  it('refuses a company asking itself for a meeting', async () => {
    const { create } = build();

    await expect(
      create.execute(createCommand({ receptoraId: SENDER_ID })),
    ).rejects.toThrow('No puedes solicitar una reunión contigo mismo');
  });

  it('refuses a membership that does not belong to the company', async () => {
    const { create } = build({ membership: null });

    await expect(create.execute(createCommand())).rejects.toThrow(ForbiddenError);
  });

  it('refuses a company that is not cleared to take part', async () => {
    const { create } = build({ enrolled: false });

    await expect(create.execute(createCommand())).rejects.toThrow(
      'Empresa no habilitada o no pertenece al evento activo',
    );
  });

  /**
   * The agenda is a grid. A window between two slots would show an hour nobody
   * else can see, and nothing would ever be able to sit next to it.
   */
  it('refuses a window that is not a slot of the grid', async () => {
    const { create } = build();

    await expect(
      create.execute(
        createCommand({ inicio: '2026-11-10T12:05:00.000Z', fin: '2026-11-10T12:25:00.000Z' }),
      ),
    ).rejects.toThrow('El horario o la duración no corresponden a la jornada configurada');
  });

  it('refuses a window that already passed', async () => {
    const { create } = build();

    await expect(
      create.execute(
        createCommand({ inicio: '2026-11-09T12:00:00.000Z', fin: '2026-11-09T12:20:00.000Z' }),
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('refuses a slot one of the companies is no longer free in', async () => {
    const { create } = build({}, {}, false);

    await expect(create.execute(createCommand())).rejects.toThrow(
      'Ese horario ya no está disponible para una de las empresas',
    );
  });

  it('refuses the same hour asked of the same company twice', async () => {
    const { create } = build({ duplicate: { id: 12 } });

    await expect(create.execute(createCommand())).rejects.toThrow(
      'Ya enviaste una solicitud para ese horario a esta empresa',
    );
  });

  it('refuses while no event is running', async () => {
    const { create } = build({ event: null });

    await expect(create.execute(createCommand())).rejects.toThrow('No hay un evento activo');
  });
});

describe('EditMeetingRequestUseCase', () => {
  it('rewrites the request and tells the other company', async () => {
    const { edit, repository, companies } = build();

    await edit.execute(55, {
      solicitanteId: SENDER_ID,
      tipo: 'VIRTUAL',
      inicio: SLOT_START,
      fin: SLOT_END,
    });

    expect(repository.updated[0]?.request.tipoReunion).toBe('VIRTUAL');
    expect(companies.sent[0]?.tipo).toBe('solicitud:editada');
  });

  /** A request being edited is not an obstacle to itself. */
  it('does not let the request block its own slot or table', async () => {
    const { edit, availability, tables } = build();

    await edit.execute(55, {
      solicitanteId: SENDER_ID,
      tipo: 'PRESENCIAL',
      inicio: SLOT_START,
      fin: SLOT_END,
    });

    expect(availability.asked[0]?.exceptRequestId).toBe(55);
    expect(tables.picks[0]?.exceptRequestId).toBe(55);
  });

  it('refuses anybody but the company that sent it', async () => {
    const { edit } = build();

    await expect(
      edit.execute(55, {
        solicitanteId: RECEIVER_ID,
        tipo: 'PRESENCIAL',
        inicio: SLOT_START,
        fin: SLOT_END,
      }),
    ).rejects.toThrow('Solo la empresa que envió la solicitud puede editarla');
  });

  it('refuses a request that was already decided', async () => {
    const { edit } = build({ request: buildRequest({ estadoSolicitud: 'ACEPTADA' }) });

    await expect(
      edit.execute(55, {
        solicitanteId: SENDER_ID,
        tipo: 'PRESENCIAL',
        inicio: SLOT_START,
        fin: SLOT_END,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('refuses a request that is not there', async () => {
    const { edit } = build({ request: null });

    await expect(
      edit.execute(404, {
        solicitanteId: SENDER_ID,
        tipo: 'PRESENCIAL',
        inicio: SLOT_START,
        fin: SLOT_END,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('AcceptMeetingRequestUseCase', () => {
  it('turns the request into a meeting and tells both companies', async () => {
    const { accept, repository, companies } = build();

    const result = await accept.execute(55, RECEIVER_ID);

    expect(result).toEqual({ reunionId: 900 });
    expect(repository.accepted).toEqual([{ requestId: 55, eventId: EVENT.id, mesaId: 3 }]);
    expect(companies.sent.map((notice) => notice.companyEventId)).toEqual([
      SENDER_ID,
      RECEIVER_ID,
    ]);
  });

  it('refuses anybody but the company that received it', async () => {
    const { accept } = build();

    await expect(accept.execute(55, SENDER_ID)).rejects.toThrow(
      'No tienes permiso para aceptar esta solicitud',
    );
  });

  it('refuses a window that has already passed', async () => {
    const { accept } = build({
      request: buildRequest({
        inicio: new Date('2026-11-09T12:00:00.000Z'),
        fin: new Date('2026-11-09T12:20:00.000Z'),
      }),
    });

    await expect(accept.execute(55, RECEIVER_ID)).rejects.toThrow('El horario propuesto ya pasó');
  });

  it('refuses when either company already has a meeting agreed then', async () => {
    const { accept } = build({ confirmedMeeting: true });

    await expect(accept.execute(55, RECEIVER_ID)).rejects.toThrow(
      'Una de las empresas ya tiene una reunión confirmada en ese horario',
    );
  });

  it('refuses when the chosen table was taken in the meantime', async () => {
    const { accept } = build({}, { free: false });

    await expect(accept.execute(55, RECEIVER_ID)).rejects.toThrow(
      'La mesa elegida por la empresa solicitante ya está ocupada',
    );
  });

  it('picks a table for an old request that never chose one', async () => {
    const { accept, repository } = build({ request: buildRequest({ mesaId: null }) }, { picked: 6 });

    await accept.execute(55, RECEIVER_ID);

    expect(repository.accepted[0]?.mesaId).toBe(6);
  });

  it('takes no table for a virtual meeting', async () => {
    const { accept, repository } = build({
      request: buildRequest({ tipoReunion: 'VIRTUAL', mesaId: 3 }),
    });

    await accept.execute(55, RECEIVER_ID);

    expect(repository.accepted[0]?.mesaId).toBeNull();
  });

  it('tells whoever else wanted that table and hour to move', async () => {
    const { accept, companies } = build({
      pendingOnTable: [{ id: 77, solicitanteId: 300 }],
    });

    await accept.execute(55, RECEIVER_ID);

    const displaced = companies.sent.find(
      (notice) => notice.tipo === 'solicitud:mesa-no-disponible',
    );
    expect(displaced?.companyEventId).toBe(300);
  });

  it('warns the event team about a virtual meeting with no link yet', async () => {
    const { accept, staff } = build({
      request: buildRequest({ tipoReunion: 'VIRTUAL', enlaceReunionVirtual: null }),
    });

    await accept.execute(55, RECEIVER_ID);

    expect(staff.sent).toEqual([{ tipo: 'staff:reunion-sin-enlace', referenciaId: 900 }]);
  });

  it('stays quiet when the virtual meeting already has its link', async () => {
    const { accept, staff } = build({
      request: buildRequest({
        tipoReunion: 'VIRTUAL',
        enlaceReunionVirtual: 'https://meet.test/abc',
      }),
    });

    await accept.execute(55, RECEIVER_ID);

    expect(staff.sent).toEqual([]);
  });
});

describe('RejectMeetingRequestUseCase', () => {
  it('rejects it and passes the reason on', async () => {
    const { reject, repository, companies } = build();

    await reject.execute(55, RECEIVER_ID, '  No nos queda la hora  ');

    expect(repository.rejected).toEqual([{ requestId: 55, motivo: 'No nos queda la hora' }]);
    expect(companies.sent[0]?.mensaje).toContain('No nos queda la hora');
  });

  it('rejects it without a reason', async () => {
    const { reject, repository, companies } = build();

    await reject.execute(55, RECEIVER_ID);

    expect(repository.rejected[0]?.motivo).toBeNull();
    expect(companies.sent[0]?.mensaje).not.toContain('Motivo');
  });

  it('refuses anybody but the company that received it', async () => {
    const { reject } = build();

    await expect(reject.execute(55, SENDER_ID)).rejects.toThrow(
      'Solo la empresa receptora puede rechazar esta solicitud',
    );
  });
});

describe('CancelMeetingRequestUseCase', () => {
  it('cancels it and tells the other company', async () => {
    const { cancel, repository, companies } = build();

    await cancel.execute(55, SENDER_ID);

    expect(repository.cancelled).toEqual([55]);
    expect(companies.sent[0]?.companyEventId).toBe(RECEIVER_ID);
    expect(companies.sent[0]?.tipo).toBe('solicitud:cancelada');
  });

  it('refuses anybody but the company that sent it', async () => {
    const { cancel } = build();

    await expect(cancel.execute(55, RECEIVER_ID)).rejects.toThrow(
      'Solo la empresa solicitante puede cancelar esta solicitud',
    );
  });
});

describe('ListMeetingRequestsUseCase', () => {
  it('answers with nothing while no event is running', async () => {
    const { list } = build({ event: null });

    expect(await list.execute(SENDER_ID)).toEqual([]);
  });

  it('asks only for the requests of the meeting window', async () => {
    const { list } = build({ views: [] });

    expect(await list.execute(SENDER_ID)).toEqual([]);
  });
});
