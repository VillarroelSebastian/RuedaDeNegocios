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
  FakeAvailability,
  FakeMeetingMessenger,
  FakeMeetingsRepository,
  type FakeMeetingsOptions,
  FakeStaffNotifier,
  FakeTables,
  MEETING_ID,
  NEXT_SLOT_START,
  RECEIVER_ID,
  SENDER_ID,
  SLOT_START,
  buildMeeting,
  buildProposal,
} from '../../test-doubles.js';
import {
  CancelOwnMeetingUseCase,
  CompleteOwnMeetingUseCase,
  ProposeRescheduleUseCase,
  RespondRescheduleUseCase,
  StartOwnMeetingUseCase,
} from './company-meetings.use-cases.js';
import {
  ListOwnMeetingResultsUseCase,
  RecordMeetingResultUseCase,
} from './meeting-results.use-cases.js';
import {
  ListEligibleCompaniesUseCase,
  ListIdleCompaniesUseCase,
  ListMeetingsUseCase,
} from './read-meetings.use-cases.js';
import {
  ChangeMeetingStatusUseCase,
  CreateMeetingUseCase,
  EvaluateMeetingUseCase,
  MessageMeetingCompanyUseCase,
  SetMeetingLinkUseCase,
} from './run-meetings.use-cases.js';

/** Well before the first slot, so a booking is still in the future. */
const NOW = new Date('2026-11-10T10:00:00.000Z');

function build(
  options: FakeMeetingsOptions = {},
  table: { picked?: number | null; free?: boolean } = {},
  slotAvailable = true,
) {
  const repository = new FakeMeetingsRepository(options);
  const tables = new FakeTables(table) as never;
  const availability = new FakeAvailability(slotAvailable) as never;
  const companies = new FakeCompanyNotifier();
  const staff = new FakeStaffNotifier();
  const messenger = new FakeMeetingMessenger();
  const clock = new FixedClock(NOW);

  return {
    repository,
    companies,
    staff,
    messenger,
    create: new CreateMeetingUseCase(repository, tables, clock, companies, staff),
    status: new ChangeMeetingStatusUseCase(repository, clock, companies),
    link: new SetMeetingLinkUseCase(repository, companies),
    message: new MessageMeetingCompanyUseCase(repository, messenger),
    evaluate: new EvaluateMeetingUseCase(repository, clock),
    cancel: new CancelOwnMeetingUseCase(repository, companies),
    start: new StartOwnMeetingUseCase(repository, clock, companies, staff),
    complete: new CompleteOwnMeetingUseCase(repository, clock, companies),
    propose: new ProposeRescheduleUseCase(repository, tables, availability, clock, companies),
    respond: new RespondRescheduleUseCase(repository, tables, companies),
    list: new ListMeetingsUseCase(repository),
    idle: new ListIdleCompaniesUseCase(repository),
    eligible: new ListEligibleCompaniesUseCase(repository),
  };
}

describe('CreateMeetingUseCase', () => {
  const command = {
    solicitanteId: SENDER_ID,
    receptoraId: RECEIVER_ID,
    tipo: 'PRESENCIAL',
    inicio: SLOT_START,
  };

  it('books the meeting and tells both companies', async () => {
    const { create, repository, companies } = build();

    const created = await create.execute(command);

    expect(created.reunionId).toBe(MEETING_ID);
    expect(created.fin).toBe('2026-11-10T12:20:00.000Z');
    // No table was named, so one was picked from the free ones.
    expect(repository.created[0]?.mesaId).toBe(4);
    expect(companies.sent).toHaveLength(2);
    expect(companies.sent[0]?.tipo).toBe('reunion:agendada');
  });

  it('takes the end of the meeting from the event, not from the client', async () => {
    const { create, repository } = build();

    await create.execute(command);

    const window = repository.created[0]!.window;
    expect(window.end.getTime() - window.start.getTime()).toBe(EVENT.duracionReunion * 60_000);
  });

  it('signs the booking with whoever answers for the first company', async () => {
    const { create, repository } = build({ responsible: { id: 777 } });

    await create.execute(command);

    expect(repository.created[0]?.companyUserId).toBe(777);
  });

  it('refuses a company meeting itself', async () => {
    const { create } = build();

    await expect(
      create.execute({ ...command, receptoraId: SENDER_ID }),
    ).rejects.toThrow('Elige dos empresas distintas');
  });

  it('refuses a company that is not cleared to take part', async () => {
    const { create } = build({ enrolled: false });

    await expect(create.execute(command)).rejects.toThrow(ConflictError);
  });

  it('refuses a first company with no one answering for it', async () => {
    const { create } = build({ responsible: null });

    await expect(create.execute(command)).rejects.toThrow(
      'La primera empresa no tiene un encargado registrado',
    );
  });

  it('refuses an hour that is not a five minute mark of an event day', async () => {
    const { create } = build();

    await expect(
      create.execute({ ...command, inicio: '2026-11-10T12:02:00.000Z' }),
    ).rejects.toThrow('El horario debe ser futuro y pertenecer a un día configurado');
  });

  it('refuses an hour that already passed', async () => {
    const { create } = build();

    await expect(
      create.execute({ ...command, inicio: '2026-11-09T12:00:00.000Z' }),
    ).rejects.toThrow(ValidationError);
  });

  it('takes no table for a virtual meeting and warns about the missing link', async () => {
    const { create, repository, staff } = build();

    await create.execute({ ...command, tipo: 'VIRTUAL' });

    expect(repository.created[0]?.mesaId).toBeNull();
    expect(staff.sent[0]?.tipo).toBe('staff:reunion-sin-enlace');
  });

  it('stays quiet when the virtual meeting is booked with its link', async () => {
    const { create, staff, repository } = build();

    await create.execute({ ...command, tipo: 'VIRTUAL', enlace: 'https://meet.test/abc' });

    expect(staff.sent).toEqual([]);
    expect(repository.created[0]?.enlaceReunionVirtual).toBe('https://meet.test/abc');
  });

  it('refuses a link that is not secure', async () => {
    const { create } = build();

    await expect(
      create.execute({ ...command, tipo: 'VIRTUAL', enlace: 'http://meet.test/abc' }),
    ).rejects.toThrow(ValidationError);
  });

  it('refuses when no table is free', async () => {
    const { create } = build({}, { picked: null });

    await expect(create.execute(command)).rejects.toThrow(
      'No hay mesas disponibles para ese horario',
    );
  });

  it('refuses a chosen table that is already taken', async () => {
    const { create } = build({}, { free: false });

    await expect(create.execute({ ...command, mesaId: 9 })).rejects.toThrow(
      'La mesa seleccionada ya está ocupada en ese horario',
    );
  });
});

describe('ChangeMeetingStatusUseCase', () => {
  it('moves a booked meeting into progress', async () => {
    const { status, repository } = build();

    await status.execute(MEETING_ID, { estadoReunion: 'EN_CURSO' });

    expect(repository.statusChanges[0]?.change.estadoReunion).toBe('EN_CURSO');
  });

  it('stamps the real end and asks both companies for their results', async () => {
    const { status, repository, companies } = build({
      meeting: buildMeeting({ estadoReunion: 'EN_CURSO' }),
    });

    await status.execute(MEETING_ID, { estadoReunion: 'FINALIZADA' });

    expect(repository.statusChanges[0]?.change.finReal).toEqual(NOW);
    expect(companies.sent.map((notice) => notice.tipo)).toEqual([
      'reunion:calificar',
      'reunion:calificar',
    ]);
  });

  it('frees the table and tells both companies when it is called off', async () => {
    const { status, repository, companies } = build();

    await status.execute(MEETING_ID, { estadoReunion: 'CANCELADA', observaciones: 'Se cayó' });

    expect(repository.cancelled[0]?.observaciones).toContain('Se cayó');
    expect(companies.sent).toHaveLength(2);
    expect(companies.sent[0]?.tipo).toBe('reunion:cancelada');
  });

  it('refuses a transition a meeting cannot make', async () => {
    const { status } = build({ meeting: buildMeeting({ estadoReunion: 'FINALIZADA' }) });

    await expect(status.execute(MEETING_ID, { estadoReunion: 'EN_CURSO' })).rejects.toThrow(
      ConflictError,
    );
  });

  it('refuses a state a meeting never has', async () => {
    const { status } = build();

    await expect(status.execute(MEETING_ID, { estadoReunion: 'PAUSADA' })).rejects.toThrow(
      ValidationError,
    );
  });
});

describe('SetMeetingLinkUseCase', () => {
  it('saves the link and tells both companies', async () => {
    const { link, repository, companies } = build({
      meeting: buildMeeting({ tipoReunion: 'VIRTUAL' }),
    });

    const result = await link.execute(MEETING_ID, 'https://meet.test/abc');

    expect(result.enlace).toBe('https://meet.test/abc');
    expect(repository.links[0]?.requestId).toBe(55);
    expect(companies.sent).toHaveLength(2);
  });

  it('refuses a meeting that is not virtual', async () => {
    const { link } = build();

    await expect(link.execute(MEETING_ID, 'https://meet.test/abc')).rejects.toThrow(
      'Reunión virtual no encontrada',
    );
  });

  it('refuses a meeting that is over', async () => {
    const { link } = build({
      meeting: buildMeeting({ tipoReunion: 'VIRTUAL', estadoReunion: 'FINALIZADA' }),
    });

    await expect(link.execute(MEETING_ID, 'https://meet.test/abc')).rejects.toThrow(
      'No se puede modificar el enlace de una reunión finalizada o cancelada',
    );
  });
});

describe('MessageMeetingCompanyUseCase', () => {
  it('writes to the company on the side that was named', async () => {
    const { message, messenger } = build();

    await message.execute(MEETING_ID, 'A', '  Pasen a la mesa 3  ');

    expect(messenger.sent).toEqual([{ correo: 'ana@test.com', mensaje: 'Pasen a la mesa 3' }]);
  });

  it('refuses an empty message', async () => {
    const { message } = build();

    await expect(message.execute(MEETING_ID, 'A', '   ')).rejects.toThrow(
      'El mensaje no puede estar vacío',
    );
  });

  it('refuses when the company has nobody to write to', async () => {
    const { message } = build({ contact: null });

    await expect(message.execute(MEETING_ID, 'B', 'Hola')).rejects.toThrow(NotFoundError);
  });
});

describe('EvaluateMeetingUseCase', () => {
  const pair = {
    calificacionA: 5,
    rangoA: '10.000 USD',
    observacionesA: 'Acuerdo',
    calificacionB: 4,
    rangoB: 'Sin acuerdo',
    observacionesB: 'Seguimos',
  };

  it('records one evaluation per company', async () => {
    const { evaluate, repository } = build({
      meeting: buildMeeting({ estadoReunion: 'EN_CURSO' }),
    });

    await evaluate.execute(MEETING_ID, pair);

    const entries = repository.evaluations[0]?.entries ?? [];
    expect(entries).toHaveLength(2);
    expect(entries[0]?.calificadora).toBe(SENDER_ID);
    expect(entries[1]?.calificadora).toBe(RECEIVER_ID);
  });

  it('refuses a meeting that is not running', async () => {
    const { evaluate } = build();

    await expect(evaluate.execute(MEETING_ID, pair)).rejects.toThrow(
      'La reunión no está en curso',
    );
  });

  it('refuses when a company has no active member to sign it', async () => {
    const { evaluate } = build({
      meeting: buildMeeting({ estadoReunion: 'EN_CURSO' }),
      membership: null,
    });

    await expect(evaluate.execute(MEETING_ID, pair)).rejects.toThrow(
      'Ambas empresas necesitan al menos un participante activo',
    );
  });
});

describe('CancelOwnMeetingUseCase', () => {
  it('calls the meeting off and tells the other company', async () => {
    const { cancel, repository, companies } = build();

    await cancel.execute(MEETING_ID, SENDER_ID, 'Viaje');

    expect(repository.cancelled[0]?.observaciones).toContain('Agro Beni');
    expect(companies.sent[0]?.companyEventId).toBe(RECEIVER_ID);
  });

  it('refuses a company that is not part of the meeting', async () => {
    const { cancel } = build();

    await expect(cancel.execute(MEETING_ID, 999)).rejects.toThrow(ForbiddenError);
  });

  it('refuses a meeting that is already running', async () => {
    const { cancel } = build({ meeting: buildMeeting({ estadoReunion: 'EN_CURSO' }) });

    await expect(cancel.execute(MEETING_ID, SENDER_ID)).rejects.toThrow(ConflictError);
  });
});

describe('StartOwnMeetingUseCase', () => {
  it('starts a meeting whose hour has come', async () => {
    const { start, repository, companies } = build({
      meeting: buildMeeting({ inicio: new Date('2026-11-10T09:00:00.000Z') }),
    });

    const result = await start.execute(MEETING_ID, SENDER_ID);

    expect(result).toEqual({ iniciada: true, esperandoContraparte: false });
    expect(repository.started).toHaveLength(1);
    expect(companies.sent).toHaveLength(2);
  });

  it('records the first company asking to start early', async () => {
    const { start, repository, companies } = build({
      meeting: buildMeeting({ inicio: new Date('2026-11-10T10:05:00.000Z') }),
    });

    const result = await start.execute(MEETING_ID, SENDER_ID);

    expect(result).toEqual({ iniciada: false, esperandoContraparte: true });
    expect(repository.earlyStarts).toEqual([
      { meetingId: MEETING_ID, companyEventId: SENDER_ID },
    ]);
    expect(companies.sent[0]?.tipo).toBe('reunion:inicio-solicitado');
  });

  it('starts once the other company agrees', async () => {
    const { start, repository } = build({
      meeting: buildMeeting({
        inicio: new Date('2026-11-10T10:05:00.000Z'),
        inicioAnticipadoPor: RECEIVER_ID,
      }),
    });

    await start.execute(MEETING_ID, SENDER_ID);

    expect(repository.started).toHaveLength(1);
  });

  it('refuses a virtual meeting with no link and alerts the team', async () => {
    const { start, staff } = build({
      meeting: buildMeeting({ tipoReunion: 'VIRTUAL', enlaceReunionVirtual: null }),
    });

    await expect(start.execute(MEETING_ID, SENDER_ID)).rejects.toThrow(
      'Esta reunión virtual todavía no tiene enlace',
    );
    expect(staff.sent[0]?.tipo).toBe('staff:reunion-sin-enlace-urgente');
  });

  it('refuses a meeting that is already running', async () => {
    const { start } = build({ meeting: buildMeeting({ estadoReunion: 'EN_CURSO' }) });

    await expect(start.execute(MEETING_ID, SENDER_ID)).rejects.toThrow(ConflictError);
  });
});

describe('CompleteOwnMeetingUseCase', () => {
  it('closes a running meeting and asks for the results', async () => {
    const { complete, repository, companies } = build({
      meeting: buildMeeting({ estadoReunion: 'EN_CURSO' }),
    });

    await complete.execute(MEETING_ID, SENDER_ID);

    expect(repository.statusChanges[0]?.change.estadoReunion).toBe('FINALIZADA');
    expect(companies.sent).toHaveLength(2);
  });

  it('refuses a meeting that never started', async () => {
    const { complete } = build();

    await expect(complete.execute(MEETING_ID, SENDER_ID)).rejects.toThrow(ConflictError);
  });
});

describe('ProposeRescheduleUseCase', () => {
  const command = { inicio: NEXT_SLOT_START };

  it('proposes the new hour and waits for the other company', async () => {
    const { propose, repository, companies } = build();

    const proposal = await propose.execute(MEETING_ID, SENDER_ID, command);

    expect(proposal.estado).toBe('PENDIENTE');
    expect(repository.createdProposals[0]?.solicitadoPorEeId).toBe(SENDER_ID);
    expect(companies.sent[0]?.tipo).toBe('reunion:cambio-solicitado');
    expect(companies.sent[0]?.companyEventId).toBe(RECEIVER_ID);
  });

  it('keeps the table it already holds when it survives the move', async () => {
    const { propose, repository } = build({}, { free: true });

    await propose.execute(MEETING_ID, SENDER_ID, command);

    expect(repository.createdProposals[0]?.mesaId).toBe(3);
  });

  it('picks another table when the one it holds is taken', async () => {
    const { propose, repository } = build({}, { free: false, picked: 8 });

    await propose.execute(MEETING_ID, SENDER_ID, command);

    expect(repository.createdProposals[0]?.mesaId).toBe(8);
  });

  it('allows only one change per meeting', async () => {
    const { propose } = build({ reschedules: 1 });

    await expect(propose.execute(MEETING_ID, SENDER_ID, command)).rejects.toThrow(
      'solo admite una solicitud de cambio de horario',
    );
  });

  it('refuses an hour outside the agenda grid', async () => {
    const { propose } = build();

    await expect(
      propose.execute(MEETING_ID, SENDER_ID, { inicio: '2026-11-10T12:05:00.000Z' }),
    ).rejects.toThrow('El nuevo horario debe ser futuro y pertenecer a la jornada del evento.');
  });

  it('refuses an hour one of the companies is no longer free in', async () => {
    const { propose } = build({}, {}, false);

    await expect(propose.execute(MEETING_ID, SENDER_ID, command)).rejects.toThrow(
      'El nuevo horario ya no está disponible para una de las empresas.',
    );
  });
});

describe('RespondRescheduleUseCase', () => {
  it('applies the change once the other company agrees', async () => {
    const { respond, repository, companies } = build();

    const result = await respond.execute(33, RECEIVER_ID, true);

    expect(result).toEqual({ estado: 'ACEPTADA' });
    expect(repository.appliedProposals).toEqual([33]);
    expect(companies.sent).toHaveLength(2);
  });

  it('records a refusal and tells whoever proposed it', async () => {
    const { respond, repository, companies } = build();

    const result = await respond.execute(33, RECEIVER_ID, false, '  No podemos  ');

    expect(result).toEqual({ estado: 'RECHAZADA' });
    expect(repository.rejectedProposals).toEqual([{ changeId: 33, motivo: 'No podemos' }]);
    expect(companies.sent[0]?.companyEventId).toBe(SENDER_ID);
  });

  it('refuses the company that proposed it answering itself', async () => {
    const { respond } = build();

    await expect(respond.execute(33, SENDER_ID, true)).rejects.toThrow(
      'Solo la contraparte puede responder esta propuesta',
    );
  });

  it('refuses a proposal that is no longer pending', async () => {
    const { respond } = build({ proposal: null });

    await expect(respond.execute(33, RECEIVER_ID, true)).rejects.toThrow(
      'La propuesta ya no está pendiente',
    );
  });

  /** Time passed while the proposal waited, so the table is checked again. */
  it('refuses when the table was taken while the proposal waited', async () => {
    const { respond } = build({}, { free: false });

    await expect(respond.execute(33, RECEIVER_ID, true)).rejects.toThrow(
      'La mesa u horario propuesto ya no está disponible',
    );
  });

  it('needs no table for a change to a virtual meeting', async () => {
    const { respond, repository } = build(
      {
        proposal: {
          ...buildProposal({ tipoReunion: 'VIRTUAL', mesaId: null }),
          meeting: buildMeeting(),
        },
      },
      { free: false },
    );

    await respond.execute(33, RECEIVER_ID, true);

    expect(repository.appliedProposals).toEqual([33]);
  });
});

describe('RecordMeetingResultUseCase', () => {
  const command = {
    companyEventId: SENDER_ID,
    companyUserId: 500,
    meetingId: MEETING_ID,
    calificacion: 5,
    rango: '10.000 USD',
    observaciones: 'Acuerdo cerrado',
  };

  function buildResults(options: FakeMeetingsOptions = {}) {
    const repository = new FakeMeetingsRepository({
      meeting: buildMeeting({ estadoReunion: 'FINALIZADA' }),
      ...options,
    });
    return {
      repository,
      record: new RecordMeetingResultUseCase(repository, new FixedClock(NOW)),
      list: new ListOwnMeetingResultsUseCase(repository),
    };
  }

  it('records the result against the other company', async () => {
    const { record, repository } = buildResults();

    const saved = await record.execute(command);

    expect(saved).toEqual({ id: 77 });
    expect(repository.ownResults[0]?.calificadora).toBe(SENDER_ID);
    expect(repository.ownResults[0]?.calificada).toBe(RECEIVER_ID);
  });

  it('refuses a company that did not take part', async () => {
    const { record } = buildResults();

    await expect(record.execute({ ...command, companyEventId: 999 })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('refuses a meeting that has not finished yet', async () => {
    const { record } = buildResults({
      meeting: buildMeeting({
        estadoReunion: 'EN_CURSO',
        fin: new Date('2026-11-10T20:00:00.000Z'),
      }),
    });

    await expect(record.execute(command)).rejects.toThrow(
      'La reunión debe estar finalizada antes de registrar el resultado',
    );
  });

  /** A meeting whose hour has passed counts, even if nobody pressed finish. */
  it('accepts a meeting whose hour has passed without being closed', async () => {
    const { record, repository } = buildResults({
      meeting: buildMeeting({
        estadoReunion: 'PROGRAMADA',
        fin: new Date('2026-11-10T09:00:00.000Z'),
      }),
    });

    await record.execute(command);

    expect(repository.ownResults).toHaveLength(1);
  });

  it('refuses a second result from the same company', async () => {
    const { record } = buildResults({ ownResult: { id: 12 } });

    await expect(record.execute(command)).rejects.toThrow(
      'Ya registraste un resultado para esta reunión',
    );
  });

  it('refuses a membership that does not belong to the company', async () => {
    const { record } = buildResults({ membership: null });

    await expect(record.execute(command)).rejects.toThrow(
      'Tu participante no está habilitado para registrar el resultado',
    );
  });

  it('refuses a score outside one to five', async () => {
    const { record } = buildResults();

    await expect(record.execute({ ...command, calificacion: 99 })).rejects.toThrow(
      ValidationError,
    );
  });

  it('hands back what the company recorded', async () => {
    const { list } = buildResults({ results: [] });

    expect(await list.execute(SENDER_ID)).toEqual([]);
  });
});

describe('the staff read models', () => {
  it('answer with nothing while no event is running', async () => {
    const { list, idle, eligible } = build({ event: null });

    expect(await list.execute()).toEqual([]);
    expect(await idle.execute()).toEqual({ empresas: [], total: 0 });
    expect(await eligible.execute()).toEqual([]);
  });

  it('count the companies that are free right now', async () => {
    const { idle } = build();

    expect(await idle.execute()).toEqual({ empresas: [expect.anything()], total: 1 });
  });
});
