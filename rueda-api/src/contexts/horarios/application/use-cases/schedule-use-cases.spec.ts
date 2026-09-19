import { describe, expect, it } from 'vitest';
import { boliviaDateTime } from '../../../../shared/domain/bolivia-time.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { FixedClock } from '../../../auth/test-doubles.js';
import {
  ASKING_ID,
  EVENT,
  type FakeScheduleOptions,
  FakeScheduleRepository,
  RECEIVING_ID,
  buildEnrollment,
} from '../../test-doubles.js';
import {
  ClearOwnBlocksUseCase,
  GetOwnDailyAvailabilityUseCase,
  ListOwnRangesUseCase,
  ListOwnSlotsUseCase,
  ReplaceOwnRangesUseCase,
  SaveOwnDailyAvailabilityUseCase,
  ToggleOwnSlotUseCase,
} from './manage-availability.use-cases.js';
import { GetAgendaUseCase, GetStaffAgendaUseCase } from './read-agenda.use-cases.js';

/** Before the first slot of the event, so nothing is in the past by default. */
const NOW = boliviaDateTime('2026-11-10', 6, 0);

function agendaOf(options: FakeScheduleOptions = {}) {
  const repository = new FakeScheduleRepository(options);
  return {
    repository,
    useCase: new GetAgendaUseCase(repository, new FixedClock(NOW)),
    staff: new GetStaffAgendaUseCase(repository, new FixedClock(NOW)),
  };
}

const window = (date: string, fromHour: number, fromMinute: number, toHour: number, toMinute: number) => ({
  start: boliviaDateTime(date, fromHour, fromMinute),
  end: boliviaDateTime(date, toHour, toMinute),
});

/** The staff grid is long, so its entries are looked up by the hour they start. */
function entryAt(agenda: { inicio: string; estado: string }[], inicio: string) {
  const entry = agenda.find((slot) => slot.inicio === inicio);
  if (!entry) throw new Error(`No slot starting at ${inicio}`);
  return entry;
}

describe('GetAgendaUseCase', () => {
  it('lays the fixed grid of the event over every meeting day', async () => {
    const { useCase } = agendaOf();

    const view = await useCase.execute({
      companyEventId: ASKING_ID,
      receptoraId: RECEIVING_ID,
    });

    // 08:00-10:00 on two days, 20 minutes plus a 10 minute break: four a day.
    expect(view.agenda).toHaveLength(8);
    expect(view.duracionMinutos).toBe(20);
    expect(view.tiempoEntreReuniones).toBe(10);
    expect(view.horarios).toHaveLength(8);
  });

  it('marks a slot either company already has a meeting in', async () => {
    const { useCase } = agendaOf({
      meetings: { [RECEIVING_ID]: [window('2026-11-10', 8, 0, 8, 20)] },
    });

    const view = await useCase.execute({
      companyEventId: ASKING_ID,
      receptoraId: RECEIVING_ID,
    });

    expect(view.agenda[0].estado).toBe('OCUPADO');
    expect(view.horarios).toHaveLength(7);
  });

  it('respects the hours the receiving company declared', async () => {
    const { useCase } = agendaOf({ ranges: [{ desde: '09:00', hasta: '10:00' }] });

    const view = await useCase.execute({
      companyEventId: ASKING_ID,
      receptoraId: RECEIVING_ID,
    });

    expect(view.agenda[0].estado).toBe('NO_DISPONIBLE');
    expect(view.horarios.every((slot) => slot.inicio >= '2026-11-10T13:00:00.000Z')).toBe(true);
  });

  it('works out the other company from the request being edited', async () => {
    const { useCase } = agendaOf();

    const view = await useCase.execute({ companyEventId: ASKING_ID, solicitudId: 55 });

    expect(view.agenda).toHaveLength(8);
  });

  it('flips to the other side when the caller is the receiving company', async () => {
    const { repository, useCase } = agendaOf();

    await useCase.execute({ companyEventId: RECEIVING_ID, solicitudId: 55 });

    // Both enrollments are read: the caller and the company on the other side.
    const asked = repository.meetingCalls.map((call) => call.companyEventId);
    expect(asked.sort((left, right) => left - right)).toEqual([
      ASKING_ID,
      RECEIVING_ID,
    ]);
  });

  it('frees the slot of the meeting being edited', async () => {
    const { repository, useCase } = agendaOf();

    await useCase.execute({
      companyEventId: ASKING_ID,
      receptoraId: RECEIVING_ID,
      excludeReunionId: 42,
    });

    expect(repository.meetingCalls.every((call) => call.excludeMeetingId === 42)).toBe(true);
  });

  it('frees the slot of the request being edited', async () => {
    const { repository, useCase } = agendaOf();

    await useCase.execute({ companyEventId: ASKING_ID, solicitudId: 55 });

    expect(repository.requestCalls.every((call) => call.excludeRequestId === 55)).toBe(true);
  });

  it('refuses when a company is no longer in the event', async () => {
    const { useCase } = agendaOf({
      enrollments: { [ASKING_ID]: buildEnrollment(), [RECEIVING_ID]: null },
    });

    await expect(
      useCase.execute({ companyEventId: ASKING_ID, receptoraId: RECEIVING_ID }),
    ).rejects.toThrow('Una de las empresas ya no está activa en el evento.');
  });

  it('refuses two companies of different events', async () => {
    const { useCase } = agendaOf({
      enrollments: {
        [ASKING_ID]: buildEnrollment(),
        [RECEIVING_ID]: buildEnrollment({ id: RECEIVING_ID, eventId: 999 }),
      },
    });

    await expect(
      useCase.execute({ companyEventId: ASKING_ID, receptoraId: RECEIVING_ID }),
    ).rejects.toThrow('Las empresas deben pertenecer al mismo evento.');
  });

  it('refuses when the other company cannot be worked out', async () => {
    const { useCase } = agendaOf({ parties: null });

    await expect(useCase.execute({ companyEventId: ASKING_ID })).rejects.toThrow(NotFoundError);
  });
});

describe('GetStaffAgendaUseCase', () => {
  it('offers the whole local day every five minutes', async () => {
    const { staff } = agendaOf();

    const view = await staff.execute({
      companyEventId: ASKING_ID,
      receptoraId: RECEIVING_ID,
    });

    expect(view.agenda[0].inicio).toBe('2026-11-10T04:00:00.000Z');
    expect(view.agenda[1].inicio).toBe('2026-11-10T04:05:00.000Z');
  });

  it('reads the slots of the local day that have already gone as past', async () => {
    const { staff } = agendaOf();

    const view = await staff.execute({
      companyEventId: ASKING_ID,
      receptoraId: RECEIVING_ID,
    });

    // The day opens at 00:00 local and the clock reads 06:00.
    expect(view.agenda[0].estado).toBe('PASADO');
  });

  it('looks past the hours the companies declared', async () => {
    const { staff } = agendaOf({
      ranges: [{ desde: '09:00', hasta: '10:00' }],
      blocks: { [ASKING_ID]: [window('2026-11-10', 0, 0, 23, 59)] },
    });

    const view = await staff.execute({
      companyEventId: ASKING_ID,
      receptoraId: RECEIVING_ID,
    });

    expect(entryAt(view.agenda, '2026-11-10T12:00:00.000Z').estado).toBe('DISPONIBLE');
  });

  it('still refuses a slot that is already taken', async () => {
    const { staff } = agendaOf({
      meetings: { [RECEIVING_ID]: [window('2026-11-10', 8, 0, 8, 20)] },
    });

    const view = await staff.execute({
      companyEventId: ASKING_ID,
      receptoraId: RECEIVING_ID,
    });

    expect(entryAt(view.agenda, '2026-11-10T12:00:00.000Z').estado).toBe('OCUPADO');
  });
});

describe('ReplaceOwnRangesUseCase', () => {
  it('saves the ranges and blocks every slot outside them', async () => {
    const repository = new FakeScheduleRepository();
    const useCase = new ReplaceOwnRangesUseCase(repository);

    const result = await useCase.execute(ASKING_ID, [{ desde: '09:00', hasta: '10:00' }]);

    expect(result.rangos).toEqual([{ desde: '09:00', hasta: '10:00' }]);
    // Four slots a day; only the two starting at or after 09:00 survive.
    expect(repository.replacedRanges[0]?.blocks).toHaveLength(4);
  });

  it('blocks nothing when the company clears its hours', async () => {
    const repository = new FakeScheduleRepository();

    await new ReplaceOwnRangesUseCase(repository).execute(ASKING_ID, []);

    expect(repository.replacedRanges[0]).toEqual({
      companyEventId: ASKING_ID,
      rangos: [],
      blocks: [],
    });
  });

  it('tells the company when a range replaced another', async () => {
    const useCase = new ReplaceOwnRangesUseCase(new FakeScheduleRepository());

    const result = await useCase.execute(ASKING_ID, [
      { desde: '08:00', hasta: '10:00' },
      { desde: '09:00', hasta: '11:00' },
    ]);

    expect(result.huboChoque).toBe(true);
    expect(result.mensaje).toContain('choque');
  });

  it('refuses hours that are not hours', async () => {
    const useCase = new ReplaceOwnRangesUseCase(new FakeScheduleRepository());

    await expect(useCase.execute(ASKING_ID, [{ desde: '25:00', hasta: '26:00' }])).rejects.toThrow(
      ValidationError,
    );
  });
});

describe('GetOwnDailyAvailabilityUseCase', () => {
  it('offers the hours of the event while nothing was configured', async () => {
    const useCase = new GetOwnDailyAvailabilityUseCase(new FakeScheduleRepository());

    const view = await useCase.execute(ASKING_ID);

    expect(view.configurado).toBe(false);
    expect(view.dias).toEqual([
      { fecha: '2026-11-10', habilitado: true, rangos: [{ desde: '08:00', hasta: '10:00' }] },
      { fecha: '2026-11-11', habilitado: true, rangos: [{ desde: '08:00', hasta: '10:00' }] },
    ]);
  });

  it('hands back what the company configured', async () => {
    const dias = [{ fecha: '2026-11-10', habilitado: false, rangos: [] }];
    const repository = new FakeScheduleRepository({
      enrollments: {
        [ASKING_ID]: buildEnrollment({ horariosDisponibilidadJson: JSON.stringify(dias) }),
      },
    });

    const view = await new GetOwnDailyAvailabilityUseCase(repository).execute(ASKING_ID);

    expect(view).toEqual({ configurado: true, dias });
  });

  it('refuses an enrollment that is not there', async () => {
    const repository = new FakeScheduleRepository({ enrollments: { [ASKING_ID]: null } });

    await expect(
      new GetOwnDailyAvailabilityUseCase(repository).execute(ASKING_ID),
    ).rejects.toThrow('Inscripción no encontrada');
  });
});

describe('SaveOwnDailyAvailabilityUseCase', () => {
  it('saves availability that sits inside the hours of the event', async () => {
    const repository = new FakeScheduleRepository();

    const view = await new SaveOwnDailyAvailabilityUseCase(repository).execute(ASKING_ID, [
      { fecha: '2026-11-10', habilitado: true, rangos: [{ desde: '08:00', hasta: '09:00' }] },
      { fecha: '2026-11-11', habilitado: false, rangos: [] },
    ]);

    expect(view.configurado).toBe(true);
    expect(repository.savedAvailability).toHaveLength(1);
  });

  it('refuses availability outside the hours the event hosts meetings in', async () => {
    const useCase = new SaveOwnDailyAvailabilityUseCase(new FakeScheduleRepository());

    await expect(
      useCase.execute(ASKING_ID, [
        { fecha: '2026-11-10', habilitado: true, rangos: [{ desde: '14:00', hasta: '17:00' }] },
      ]),
    ).rejects.toThrow('Tu disponibilidad debe estar dentro de los horarios de reuniones');
  });

  it('refuses a day whose ranges overlap', async () => {
    const useCase = new SaveOwnDailyAvailabilityUseCase(new FakeScheduleRepository());

    await expect(
      useCase.execute(ASKING_ID, [
        {
          fecha: '2026-11-10',
          habilitado: true,
          rangos: [
            { desde: '08:00', hasta: '09:00' },
            { desde: '08:30', hasta: '10:00' },
          ],
        },
      ]),
    ).rejects.toThrow('no pueden superponerse');
  });
});

describe('ListOwnSlotsUseCase', () => {
  it('flags the slots the company blocked', async () => {
    const repository = new FakeScheduleRepository({
      blocks: { [ASKING_ID]: [window('2026-11-10', 8, 0, 8, 20)] },
    });

    const slots = await new ListOwnSlotsUseCase(repository).execute(ASKING_ID);

    expect(slots).toHaveLength(8);
    expect(slots[0].disponible).toBe(false);
    expect(slots[1].disponible).toBe(true);
  });
});

describe('ClearOwnBlocksUseCase', () => {
  it('frees every slot the company had blocked', async () => {
    const repository = new FakeScheduleRepository();

    await new ClearOwnBlocksUseCase(repository).execute(ASKING_ID);

    expect(repository.clearedBlocks).toEqual([ASKING_ID]);
  });
});

describe('ToggleOwnSlotUseCase', () => {
  const inicio = '2026-11-10T12:00:00.000Z';
  const fin = '2026-11-10T12:20:00.000Z';

  it('blocks a slot that was free', async () => {
    const repository = new FakeScheduleRepository();

    const result = await new ToggleOwnSlotUseCase(repository).execute(ASKING_ID, inicio, fin);

    expect(result).toEqual({ disponible: false });
    expect(repository.createdBlocks).toHaveLength(1);
  });

  it('frees a slot that was blocked', async () => {
    const repository = new FakeScheduleRepository({ blockAt: { id: 9 } });

    const result = await new ToggleOwnSlotUseCase(repository).execute(ASKING_ID, inicio, fin);

    expect(result).toEqual({ disponible: true });
    expect(repository.deactivatedBlocks).toEqual([9]);
  });

  it('refuses a slot that ends before it starts', async () => {
    const useCase = new ToggleOwnSlotUseCase(new FakeScheduleRepository());

    await expect(useCase.execute(ASKING_ID, fin, inicio)).rejects.toThrow(ValidationError);
  });
});

describe('ListOwnRangesUseCase', () => {
  it('hands back the hours the company declared', async () => {
    const ranges = [{ desde: '09:00', hasta: '12:00' }];
    const useCase = new ListOwnRangesUseCase(new FakeScheduleRepository({ ranges }));

    expect(await useCase.execute(ASKING_ID)).toEqual(ranges);
  });
});

describe('the event the doubles describe', () => {
  it('hosts meetings on two days of two hours each', () => {
    expect(EVENT.duracionReunion).toBe(20);
  });
});
