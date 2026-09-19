import { describe, expect, it } from 'vitest';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FixedClock } from '../../../auth/test-doubles.js';
import { FakeCompanyNotifier } from '../../../pagos/test-doubles.js';
import {
  EVENT,
  type FakeActivitiesOptions,
  FakeActivitiesRepository,
  buildActivity,
  buildDraftBody,
} from '../../test-doubles.js';
import {
  CreateActivityUseCase,
  DeleteActivityUseCase,
  UpdateActivityUseCase,
} from './manage-activities.use-cases.js';
import {
  GetLiveScheduleUseCase,
  ListActivitiesUseCase,
  ListOwnSubscriptionsUseCase,
  ListUpcomingActivitiesUseCase,
} from './read-activities.use-cases.js';
import {
  AnnounceOnActivityUseCase,
  RemoveActivityAnnouncementUseCase,
  SetActivitySubscriptionUseCase,
  SetLiveStatusUseCase,
} from './live-schedule.use-cases.js';

const NOW = new Date('2026-11-10T17:30:00.000Z');
const COMPANY_EVENT_ID = 100;
const STAFF_USER_ID = 3;

function repositoryOf(options: FakeActivitiesOptions = {}) {
  return new FakeActivitiesRepository(options);
}

describe('ListActivitiesUseCase', () => {
  it('hands back the programme of the current event', async () => {
    const useCase = new ListActivitiesUseCase(repositoryOf());

    const activities = await useCase.execute();

    expect(activities).toHaveLength(1);
    expect(activities[0]?.horaInicioActividad).toBe('09:00');
  });

  it('answers with an empty programme while no event is running', async () => {
    const useCase = new ListActivitiesUseCase(repositoryOf({ event: null }));

    expect(await useCase.execute()).toEqual([]);
  });

  it('answers with an empty programme for an event that is not there', async () => {
    const useCase = new ListActivitiesUseCase(repositoryOf({ event: null }));

    expect(await useCase.execute(404)).toEqual([]);
  });
});

describe('ListUpcomingActivitiesUseCase', () => {
  it('asks for the activities of today onwards, in the event time zone', async () => {
    const repository = repositoryOf();
    const useCase = new ListUpcomingActivitiesUseCase(repository, new FixedClock(NOW));

    await useCase.execute();

    // 17:30 UTC is still the 10th in Bolivia, so the day starts at 04:00 UTC.
    expect(repository.upcomingCalls[0]?.from.toISOString()).toBe('2026-11-10T04:00:00.000Z');
    expect(repository.upcomingCalls[0]?.limit).toBe(6);
  });

  it('honours a smaller limit', async () => {
    const repository = repositoryOf();
    const useCase = new ListUpcomingActivitiesUseCase(repository, new FixedClock(NOW));

    await useCase.execute(3);

    expect(repository.upcomingCalls[0]?.limit).toBe(3);
  });

  it('refuses to be asked for an unbounded page', async () => {
    const useCase = new ListUpcomingActivitiesUseCase(repositoryOf(), new FixedClock(NOW));

    await expect(useCase.execute(500)).rejects.toThrow(ValidationError);
  });
});

describe('GetLiveScheduleUseCase', () => {
  it('stamps the moment the client can refresh against', async () => {
    const useCase = new GetLiveScheduleUseCase(repositoryOf(), new FixedClock(NOW));

    const schedule = await useCase.execute();

    expect(schedule.actualizadoEn).toBe(NOW.toISOString());
  });

  it('lists what is on air right now', async () => {
    const repository = repositoryOf({
      activities: [
        buildActivity({ id: 1, estadoEnVivo: 'EN_VIVO' }),
        buildActivity({ id: 2, estadoEnVivo: 'PENDIENTE' }),
      ],
    });
    const useCase = new GetLiveScheduleUseCase(repository, new FixedClock(NOW));

    const schedule = await useCase.execute();

    expect(schedule.enVivo).toEqual([1]);
    expect(schedule.actividades).toHaveLength(2);
  });

  it('answers with an empty schedule while no event is running', async () => {
    const useCase = new GetLiveScheduleUseCase(repositoryOf({ event: null }), new FixedClock(NOW));

    const schedule = await useCase.execute();

    expect(schedule.actividades).toEqual([]);
    expect(schedule.enVivo).toEqual([]);
  });
});

describe('ListOwnSubscriptionsUseCase', () => {
  it('hands back only the ids the company follows', async () => {
    const useCase = new ListOwnSubscriptionsUseCase(
      repositoryOf({ subscribedActivityIds: [1, 4] }),
    );

    expect(await useCase.execute(COMPANY_EVENT_ID)).toEqual([1, 4]);
  });
});

describe('CreateActivityUseCase', () => {
  it('stores a sanitised draft against the current event', async () => {
    const repository = repositoryOf();
    const useCase = new CreateActivityUseCase(repository);

    await useCase.execute(buildDraftBody({ nombreActividad: '  Apertura  oficial ' }));

    expect(repository.created[0]?.eventId).toBe(EVENT.id);
    expect(repository.created[0]?.draft.nombreActividad).toBe('Apertura oficial');
  });

  it('refuses a day outside the event', async () => {
    const useCase = new CreateActivityUseCase(repositoryOf());

    await expect(useCase.execute(buildDraftBody({ fechaActividad: '2026-12-01' }))).rejects.toThrow(
      'La fecha de la actividad debe estar dentro de las fechas del evento.',
    );
  });

  it('refuses while no event is configured', async () => {
    const useCase = new CreateActivityUseCase(repositoryOf({ event: null }));

    await expect(useCase.execute(buildDraftBody())).rejects.toThrow(
      'No hay evento principal configurado',
    );
  });
});

describe('UpdateActivityUseCase', () => {
  it('rewrites an activity of the current event', async () => {
    const repository = repositoryOf();
    const useCase = new UpdateActivityUseCase(repository);

    await useCase.execute(1, buildDraftBody({ nombreActividad: 'Clausura' }));

    expect(repository.updated[0]?.activityId).toBe(1);
    expect(repository.updated[0]?.draft.nombreActividad).toBe('Clausura');
  });

  it('refuses an activity that does not belong to the current event', async () => {
    const useCase = new UpdateActivityUseCase(repositoryOf({ activities: [] }));

    await expect(useCase.execute(404, buildDraftBody())).rejects.toThrow(
      'Actividad no encontrada en el evento activo',
    );
  });
});

describe('DeleteActivityUseCase', () => {
  it('retires the activity instead of erasing it', async () => {
    const repository = repositoryOf();
    const useCase = new DeleteActivityUseCase(repository);

    await useCase.execute(1);

    expect(repository.deactivated).toEqual([1]);
  });

  it('refuses an activity that does not belong to the current event', async () => {
    const useCase = new DeleteActivityUseCase(repositoryOf({ activities: [] }));

    await expect(useCase.execute(404)).rejects.toThrow(NotFoundError);
  });
});

describe('SetActivitySubscriptionUseCase', () => {
  it('subscribes the enrollment that asked, never one it names', async () => {
    const repository = repositoryOf();
    const useCase = new SetActivitySubscriptionUseCase(repository);

    await useCase.execute(1, COMPANY_EVENT_ID, true);

    expect(repository.subscriptions).toEqual([
      { activityId: 1, companyEventId: COMPANY_EVENT_ID, subscribed: true },
    ]);
  });

  it('unsubscribes without removing the record', async () => {
    const repository = repositoryOf();
    const useCase = new SetActivitySubscriptionUseCase(repository);

    await useCase.execute(1, COMPANY_EVENT_ID, false);

    expect(repository.subscriptions[0]?.subscribed).toBe(false);
  });

  it('refuses an activity of another event', async () => {
    const useCase = new SetActivitySubscriptionUseCase(
      repositoryOf({ enrollmentEvent: { eventId: 999 } }),
    );

    await expect(useCase.execute(1, COMPANY_EVENT_ID, true)).rejects.toThrow(
      'Actividad o empresa no válidas para este evento.',
    );
  });

  it('refuses an enrollment that no longer exists', async () => {
    const useCase = new SetActivitySubscriptionUseCase(repositoryOf({ enrollmentEvent: null }));

    await expect(useCase.execute(1, COMPANY_EVENT_ID, true)).rejects.toThrow(ForbiddenError);
  });
});

describe('AnnounceOnActivityUseCase', () => {
  function build(options: FakeActivitiesOptions = {}) {
    const repository = repositoryOf(options);
    const notifier = new FakeCompanyNotifier();
    return { useCase: new AnnounceOnActivityUseCase(repository, notifier), repository, notifier };
  }

  it('records the announcement under the staff member who wrote it', async () => {
    const { useCase, repository } = build();

    await useCase.execute(1, STAFF_USER_ID, '  Cambio de sala  ');

    expect(repository.addedAnnouncements).toEqual([
      { activityId: 1, userId: STAFF_USER_ID, mensaje: 'Cambio de sala' },
    ]);
  });

  it('tells every company following the activity', async () => {
    const { useCase, notifier } = build({ subscribers: [100, 101] });

    await useCase.execute(1, STAFF_USER_ID, 'Cambio de sala');

    expect(notifier.sent).toHaveLength(2);
    expect(notifier.sent[0]?.tipo).toBe('evento:anuncio');
    expect(notifier.sent[0]?.titulo).toBe('Aviso: Apertura oficial');
  });

  it('refuses an empty announcement', async () => {
    const { useCase } = build();

    await expect(useCase.execute(1, STAFF_USER_ID, '   ')).rejects.toThrow(ValidationError);
  });

  it('refuses an activity outside the current event', async () => {
    const { useCase } = build({ activities: [] });

    await expect(useCase.execute(404, STAFF_USER_ID, 'Hola')).rejects.toThrow(NotFoundError);
  });
});

describe('RemoveActivityAnnouncementUseCase', () => {
  it('retires the announcement', async () => {
    const repository = repositoryOf();
    const useCase = new RemoveActivityAnnouncementUseCase(repository);

    await useCase.execute(55);

    expect(repository.deactivatedAnnouncements).toEqual([55]);
  });

  it('refuses an announcement of another event', async () => {
    const useCase = new RemoveActivityAnnouncementUseCase(repositoryOf({ announcement: null }));

    await expect(useCase.execute(55)).rejects.toThrow('Anuncio no encontrado.');
  });
});

describe('SetLiveStatusUseCase', () => {
  function build(options: FakeActivitiesOptions = {}) {
    const repository = repositoryOf(options);
    const notifier = new FakeCompanyNotifier();
    const useCase = new SetLiveStatusUseCase(repository, notifier, new FixedClock(NOW));
    return { useCase, repository, notifier };
  }

  it('stamps the real start and announces it to the subscribers', async () => {
    const { useCase, repository, notifier } = build({ subscribers: [100] });

    await useCase.execute(1, 'EN_VIVO');

    expect(repository.transitions[0]?.transition.horaInicioReal).toEqual(NOW);
    expect(notifier.sent[0]?.tipo).toBe('evento:inicio');
    expect(notifier.sent[0]?.titulo).toBe('Ya inició: Apertura oficial');
  });

  it('stays quiet when the activity was already live', async () => {
    const { useCase, notifier } = build({
      subscribers: [100],
      liveStatus: { estadoEnVivo: 'EN_VIVO', horaInicioReal: NOW, horaFinReal: null },
    });

    await useCase.execute(1, 'EN_VIVO', 'Sigue en curso');

    expect(notifier.sent).toEqual([]);
  });

  it('refuses a state the schedule does not have', async () => {
    const { useCase } = build();

    await expect(useCase.execute(1, 'EMPEZANDO')).rejects.toThrow(ValidationError);
  });

  it('refuses an activity outside the current event', async () => {
    const { useCase } = build({ activities: [], liveStatus: null });

    await expect(useCase.execute(404, 'EN_VIVO')).rejects.toThrow('Actividad no encontrada.');
  });

  it('hands back the schedule the staff screen re-renders', async () => {
    const { useCase } = build();

    const schedule = await useCase.execute(1, 'EN_VIVO');

    expect(schedule.actualizadoEn).toBe(NOW.toISOString());
    expect(schedule.actividades).toHaveLength(1);
  });
});
