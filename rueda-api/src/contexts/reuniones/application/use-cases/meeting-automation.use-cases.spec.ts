import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { FakeCompanyNotifier } from '../../../pagos/test-doubles.js';
import {
  FakeMeetingsRepository,
  FakeStaffNotifier,
  MEETING_ID,
  RECEIVER_ID,
  SENDER_ID,
  buildAutomatedMeeting,
} from '../../test-doubles.js';
import {
  SendMeetingRemindersUseCase,
  SyncMeetingStatesUseCase,
} from './meeting-automation.use-cases.js';

const NOW = new Date('2026-11-10T12:00:00.000Z');

class FixedClock {
  now(): Date {
    return NOW;
  }
}

function remindersOf(repository: FakeMeetingsRepository, companies = new FakeCompanyNotifier()) {
  return {
    companies,
    useCase: new SendMeetingRemindersUseCase(repository, companies, new FixedClock()),
  };
}

function syncOf(
  repository: FakeMeetingsRepository,
  companies = new FakeCompanyNotifier(),
  staff = new FakeStaffNotifier(),
) {
  return {
    companies,
    staff,
    useCase: new SyncMeetingStatesUseCase(repository, companies, staff, new FixedClock()),
  };
}

describe('SendMeetingRemindersUseCase', () => {
  it('does nothing while no event is running', async () => {
    const repository = new FakeMeetingsRepository({ event: null });
    const { companies, useCase } = remindersOf(repository);

    await useCase.execute();

    expect(companies.sent).toEqual([]);
  });

  it('warns both companies and names the other one to each', async () => {
    const repository = new FakeMeetingsRepository({
      automation: { reminders: [buildAutomatedMeeting()] },
    });
    const { companies, useCase } = remindersOf(repository);

    await useCase.execute();

    expect(companies.sent).toHaveLength(2);
    expect(companies.sent[0]).toMatchObject({
      companyEventId: SENDER_ID,
      tipo: 'reunion:recordatorio',
      referenciaId: MEETING_ID,
    });
    expect(companies.sent[0]?.mensaje).toContain('Beta');
    expect(companies.sent[1]).toMatchObject({ companyEventId: RECEIVER_ID });
    expect(companies.sent[1]?.mensaje).toContain('Acme');
  });

  it('flags the reminder as sent, so it never goes out twice', async () => {
    const repository = new FakeMeetingsRepository({
      automation: { reminders: [buildAutomatedMeeting()] },
    });

    await remindersOf(repository).useCase.execute();

    expect(repository.remindersSent).toEqual([MEETING_ID]);
  });

  it('keeps going when one meeting has no companies to write to', async () => {
    const repository = new FakeMeetingsRepository({
      automation: {
        reminders: [
          buildAutomatedMeeting({ id: 1, solicitanteId: null, receptoraId: null }),
          buildAutomatedMeeting({ id: 2 }),
        ],
      },
    });
    const { companies, useCase } = remindersOf(repository);

    await useCase.execute();

    expect(companies.sent).toHaveLength(2);
    expect(repository.remindersSent).toEqual([1, 2]);
  });
});

describe('SyncMeetingStatesUseCase, starting meetings', () => {
  it('starts a meeting whose hour arrived and tells both companies', async () => {
    const repository = new FakeMeetingsRepository({
      automation: { dueToStart: [buildAutomatedMeeting()] },
    });
    const { companies, useCase } = syncOf(repository);

    await useCase.execute();

    expect(repository.started).toEqual([{ meetingId: MEETING_ID, startedAt: NOW }]);
    expect(companies.sent.filter((sent) => sent.tipo === 'reunion:iniciada')).toHaveLength(2);
  });

  it('refuses to start a remote meeting with no link, and calls the team instead', async () => {
    const repository = new FakeMeetingsRepository({
      automation: {
        dueToStart: [buildAutomatedMeeting({ tipoReunion: 'VIRTUAL', enlace: null })],
      },
    });
    const { companies, staff, useCase } = syncOf(repository);

    await useCase.execute();

    expect(repository.started).toEqual([]);
    expect(companies.sent).toEqual([]);
    expect(staff.sent[0]).toMatchObject({
      tipo: 'staff:reunion-sin-enlace-urgente',
      referenciaId: MEETING_ID,
      urgente: true,
    });
  });

  it('starts a remote meeting that does have a link', async () => {
    const repository = new FakeMeetingsRepository({
      automation: {
        dueToStart: [
          buildAutomatedMeeting({ tipoReunion: 'VIRTUAL', enlace: 'https://meet.example/abc' }),
        ],
      },
    });
    const { companies, useCase } = syncOf(repository);

    await useCase.execute();

    expect(repository.started).toHaveLength(1);
    expect(companies.sent[0]?.mensaje).toContain('enlace');
  });

  it('says nothing when somebody started the meeting first', async () => {
    const repository = new FakeMeetingsRepository({
      automation: { dueToStart: [buildAutomatedMeeting()] },
      startFailure: new ConflictError('La reunión ya fue iniciada o ya no está disponible.'),
    });
    const { companies, useCase } = syncOf(repository);

    await useCase.execute();

    expect(companies.sent).toEqual([]);
  });
});

describe('SyncMeetingStatesUseCase, closing meetings', () => {
  it('warns both companies that the meeting is about to end', async () => {
    const repository = new FakeMeetingsRepository({
      automation: {
        endingSoon: [
          buildAutomatedMeeting({
            estadoReunion: 'EN_CURSO',
            fin: new Date('2026-11-10T12:04:00.000Z'),
          }),
        ],
      },
    });
    const { companies, useCase } = syncOf(repository);

    await useCase.execute();

    expect(companies.sent).toHaveLength(2);
    expect(companies.sent[0]?.tipo).toBe('reunion:finaliza-5m');
    expect(companies.sent[0]?.mensaje).toContain('4 minuto(s)');
  });

  it('closes a meeting that ran past its hour and asks for the evaluation', async () => {
    const repository = new FakeMeetingsRepository({
      automation: { overdue: [buildAutomatedMeeting({ estadoReunion: 'EN_CURSO' })] },
    });
    const { companies, useCase } = syncOf(repository);

    await useCase.execute();

    expect(repository.statusChanges).toEqual([
      { meetingId: MEETING_ID, change: { estadoReunion: 'FINALIZADA', finReal: NOW } },
    ]);
    expect(companies.sent.filter((sent) => sent.tipo === 'reunion:calificar')).toHaveLength(2);
  });
});

describe('SyncMeetingStatesUseCase, virtual meetings without a link', () => {
  it('calls the team when the link is still missing half an hour before', async () => {
    const repository = new FakeMeetingsRepository({
      automation: {
        withoutLinkSoon: [buildAutomatedMeeting({ tipoReunion: 'VIRTUAL', enlace: null })],
      },
    });
    const { staff, useCase } = syncOf(repository);

    await useCase.execute();

    expect(staff.sent[0]).toMatchObject({
      tipo: 'staff:reunion-sin-enlace-30m',
      urgente: true,
    });
    expect(staff.sent[0]?.mensaje).toContain('08:00');
  });

  it('reminds the team to open the Teams room five minutes before', async () => {
    const repository = new FakeMeetingsRepository({
      automation: {
        teamsSoon: [
          buildAutomatedMeeting({
            tipoReunion: 'VIRTUAL',
            enlace: 'https://teams.microsoft.com/l/meetup',
          }),
        ],
      },
    });
    const { staff, useCase } = syncOf(repository);

    await useCase.execute();

    expect(staff.sent[0]?.tipo).toBe('staff:reunion-teams-iniciar');
  });

  it('raises the standing notice for every remote meeting still missing its link', async () => {
    const repository = new FakeMeetingsRepository({
      automation: {
        withoutLink: [buildAutomatedMeeting({ tipoReunion: 'VIRTUAL', enlace: null })],
      },
    });
    const { staff, useCase } = syncOf(repository);

    await useCase.reviewPendingLinks();

    expect(staff.sent[0]).toMatchObject({
      tipo: 'staff:reunion-sin-enlace',
      urgente: false,
    });
  });
});
