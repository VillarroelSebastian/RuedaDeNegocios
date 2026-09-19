import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  EVENT,
  FakeTablesRepository,
  type FakeTablesOptions,
  buildMeeting,
  buildSummary,
  buildTable,
} from '../../test-doubles.js';
import {
  AddTablesUseCase,
  RemoveTableUseCase,
  UpdateTableUseCase,
} from './manage-tables.use-cases.js';
import {
  GetTableOccupancyUseCase,
  GetTableUseCase,
  ListAvailableTablesUseCase,
  ListTablesUseCase,
} from './read-tables.use-cases.js';

const START = '2026-11-10T14:00:00.000Z';
const END = '2026-11-10T14:20:00.000Z';

function repositoryOf(options: FakeTablesOptions = {}) {
  return new FakeTablesRepository(options);
}

describe('ListTablesUseCase', () => {
  it('paints every table with the state its bookings give it', async () => {
    const useCase = new ListTablesUseCase(
      repositoryOf({
        bookings: [
          buildTable({ id: 1, reuniones: [buildMeeting({ estadoReunion: 'EN_CURSO' })] }),
          buildTable({ id: 2, numeroMesa: 2 }),
        ],
      }),
    );

    const view = await useCase.execute();

    expect(view.mesas[0]?.estadoMesa).toBe('EN_USO');
    expect(view.mesas[1]?.estadoMesa).toBe('LIBRE');
    expect(view.eventoConfig?.id).toBe(EVENT.id);
  });

  it('points at the meeting happening now as the current one', async () => {
    const useCase = new ListTablesUseCase(
      repositoryOf({
        bookings: [
          buildTable({
            reuniones: [
              buildMeeting({ id: 50, estadoReunion: 'PROGRAMADA' }),
              buildMeeting({ id: 51, estadoReunion: 'EN_CURSO' }),
            ],
          }),
        ],
      }),
    );

    const view = await useCase.execute();

    expect(view.mesas[0]?.reunionActual?.id).toBe(51);
  });

  it('falls back to the next booked meeting when none is running', async () => {
    const useCase = new ListTablesUseCase(
      repositoryOf({
        bookings: [
          buildTable({
            reuniones: [
              buildMeeting({ id: 60, estadoReunion: 'FINALIZADA' }),
              buildMeeting({ id: 61, estadoReunion: 'PROGRAMADA' }),
            ],
          }),
        ],
      }),
    );

    expect((await useCase.execute()).mesas[0]?.reunionActual?.id).toBe(61);
  });

  it('reads the bookings inside the meeting window of the event', async () => {
    const repository = repositoryOf();
    const useCase = new ListTablesUseCase(repository);

    await useCase.execute();

    // The event carries bare dates, so the window is the default working day:
    // 08:00-18:00 local, which is 12:00-22:00 UTC.
    expect(repository.windows[0]?.start.toISOString()).toBe('2026-11-10T12:00:00.000Z');
    expect(repository.windows[0]?.end.toISOString()).toBe('2026-11-13T22:00:00.000Z');
  });

  it('answers with an empty floor while no event is running', async () => {
    const useCase = new ListTablesUseCase(repositoryOf({ event: null }));

    expect(await useCase.execute()).toEqual({ mesas: [], eventoConfig: null });
  });
});

describe('GetTableUseCase', () => {
  it('shows one table with its bookings', async () => {
    const view = await new GetTableUseCase(repositoryOf()).execute(1);

    expect(view.id).toBe(1);
    expect(view.estadoMesa).toBe('LIBRE');
  });

  it('refuses a table of another event', async () => {
    await expect(new GetTableUseCase(repositoryOf({ table: null })).execute(404)).rejects.toThrow(
      'Mesa no encontrada',
    );
  });

  it('refuses while no event is running', async () => {
    await expect(new GetTableUseCase(repositoryOf({ event: null })).execute(1)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('ListAvailableTablesUseCase', () => {
  it('offers the tables nothing else is using', async () => {
    const useCase = new ListAvailableTablesUseCase(repositoryOf({ busyTableIds: [2] }));

    const available = await useCase.execute(START, END);

    expect(available.map((table) => table.id)).toEqual([1]);
  });

  it('asks about the window widened by the cleanup time', async () => {
    const repository = repositoryOf();
    const useCase = new ListAvailableTablesUseCase(repository);

    await useCase.execute(START, END);

    // 10 minutes of cleanup on each side of 14:00-14:20.
    const asked = repository.windows.at(-1);
    expect(asked?.start.toISOString()).toBe('2026-11-10T13:50:00.000Z');
    expect(asked?.end.toISOString()).toBe('2026-11-10T14:30:00.000Z');
  });

  it('offers one seat per table number even when the data repeats it', async () => {
    const useCase = new ListAvailableTablesUseCase(
      repositoryOf({
        bookable: [
          buildSummary({ id: 9, numeroMesa: 3 }),
          buildSummary({ id: 4, numeroMesa: 3 }),
        ],
      }),
    );

    expect(await useCase.execute(START, END)).toHaveLength(1);
  });

  it('refuses a window that ends before it starts', async () => {
    await expect(new ListAvailableTablesUseCase(repositoryOf()).execute(END, START)).rejects.toThrow(
      ValidationError,
    );
  });

  it('answers with nothing while no event is running', async () => {
    const useCase = new ListAvailableTablesUseCase(repositoryOf({ event: null }));

    expect(await useCase.execute(START, END)).toEqual([]);
  });
});

describe('GetTableOccupancyUseCase', () => {
  it('reads the whole local day of the event', async () => {
    const repository = repositoryOf();
    const useCase = new GetTableOccupancyUseCase(repository);

    await useCase.execute(1, '2026-11-10');

    const day = repository.windows.at(-1);
    expect(day?.start.toISOString()).toBe('2026-11-10T04:00:00.000Z');
    expect(day?.end.toISOString()).toBe('2026-11-11T04:00:00.000Z');
  });

  it('hands back each busy stretch with its cleanup time already applied', async () => {
    const useCase = new GetTableOccupancyUseCase(
      repositoryOf({
        busyWindows: [{ start: new Date(START), end: new Date(END) }],
      }),
    );

    const { ocupado } = await useCase.execute(1, '2026-11-10');

    expect(ocupado).toEqual([
      { inicio: '2026-11-10T13:50:00.000Z', fin: '2026-11-10T14:30:00.000Z' },
    ]);
  });

  it('refuses a day that is not one', async () => {
    await expect(new GetTableOccupancyUseCase(repositoryOf()).execute(1, '10/11/2026')).rejects.toThrow(
      'fecha requerida (YYYY-MM-DD)',
    );
  });
});

describe('AddTablesUseCase', () => {
  it('raises the capacity the event declares and provisions to match', async () => {
    const repository = repositoryOf();
    const useCase = new AddTablesUseCase(repository);

    const result = await useCase.execute(3);

    expect(repository.totals).toEqual([
      { eventId: EVENT.id, total: 13, capacityPerTable: 4 },
    ]);
    expect(result).toEqual({ creadas: 3, totalMesas: 13 });
  });

  it('honours a different capacity per table', async () => {
    const repository = repositoryOf();

    await new AddTablesUseCase(repository).execute(2, 6);

    expect(repository.totals[0]?.capacityPerTable).toBe(6);
  });

  it.each([0, -1, 500])('refuses to add %s tables', async (cantidad) => {
    await expect(new AddTablesUseCase(repositoryOf()).execute(cantidad)).rejects.toThrow(
      ValidationError,
    );
  });

  it('refuses while no event is configured', async () => {
    await expect(new AddTablesUseCase(repositoryOf({ event: null })).execute(2)).rejects.toThrow(
      'No hay evento principal configurado',
    );
  });
});

describe('UpdateTableUseCase', () => {
  it('changes the seats and whether the table may be booked', async () => {
    const repository = repositoryOf();

    await new UpdateTableUseCase(repository).execute(1, {
      capacidadPersonas: 8,
      estaHabilitada: false,
    });

    expect(repository.patches).toEqual([
      { tableId: 1, patch: { capacidadPersonas: 8, estaHabilitada: false } },
    ]);
  });

  it('leaves untouched what the request did not name', async () => {
    const repository = repositoryOf();

    await new UpdateTableUseCase(repository).execute(1, { estaHabilitada: true });

    expect(repository.patches[0]?.patch).toEqual({ estaHabilitada: true });
  });

  it('refuses a change that says nothing', async () => {
    await expect(new UpdateTableUseCase(repositoryOf()).execute(1, {})).rejects.toThrow(
      ValidationError,
    );
  });

  it('refuses a capacity of nobody', async () => {
    await expect(
      new UpdateTableUseCase(repositoryOf()).execute(1, { capacidadPersonas: 0 }),
    ).rejects.toThrow(ValidationError);
  });

  // The legacy endpoints updated by id alone, so a table of another event could
  // be edited or removed from the panel of the current one.
  it('refuses a table that does not belong to the current event', async () => {
    await expect(
      new UpdateTableUseCase(repositoryOf({ summary: null })).execute(404, {
        estaHabilitada: true,
      }),
    ).rejects.toThrow('Mesa no encontrada');
  });
});

describe('RemoveTableUseCase', () => {
  it('retires the table instead of erasing it', async () => {
    const repository = repositoryOf();

    await new RemoveTableUseCase(repository).execute(1);

    expect(repository.deactivated).toEqual([1]);
  });

  it('refuses a table that does not belong to the current event', async () => {
    await expect(
      new RemoveTableUseCase(repositoryOf({ summary: null })).execute(404),
    ).rejects.toThrow(NotFoundError);
  });
});
