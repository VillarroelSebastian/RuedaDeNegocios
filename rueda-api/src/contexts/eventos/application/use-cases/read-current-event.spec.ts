import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import { FakeEventRepository, buildEventRecord } from '../../test-doubles.js';
import { GetCurrentEventBrandingUseCase } from './get-current-event-branding.use-case.js';
import { GetCurrentEventConfigUseCase } from './get-current-event-config.use-case.js';
import { GetCurrentEventUseCase } from './get-current-event.use-case.js';
import { UpdateCurrentEventConfigUseCase } from './update-current-event-config.use-case.js';

const STATS = { empresasCount: 12, mesasCount: 50, actividadesCount: 8, tecnicosCount: 3 };

describe('GetCurrentEventUseCase', () => {
  it('returns the principal event with its stats and meeting window', async () => {
    const repository = new FakeEventRepository([buildEventRecord()], 1, STATS);

    const view = await new GetCurrentEventUseCase(repository).execute();

    expect(view?.id).toBe(1);
    expect(view?.stats).toEqual(STATS);
    expect(view?.fechaInicioReuniones.toISOString()).toBe('2026-11-03T12:00:00.000Z');
    expect(view?.fechaFinReuniones.toISOString()).toBe('2026-11-04T22:00:00.000Z');
  });

  it('derives the meeting window from the saved logistics when they exist', async () => {
    const repository = new FakeEventRepository([
      buildEventRecord({
        horariosReunionJson: JSON.stringify([
          { fecha: '2026-11-03', habilitado: true, rangos: [{ desde: '09:00', hasta: '12:00' }] },
        ]),
      }),
    ]);

    const view = await new GetCurrentEventUseCase(repository).execute();

    expect(view?.fechaInicioReuniones.toISOString()).toBe('2026-11-03T04:00:00.000Z');
    expect(view?.fechaFinReuniones.toISOString()).toBe('2026-11-04T04:00:00.000Z');
  });

  it('answers null when no event is published', async () => {
    expect(await new GetCurrentEventUseCase(new FakeEventRepository([])).execute()).toBeNull();
  });

  it('ignores an event that is not the principal one', async () => {
    const repository = new FakeEventRepository([buildEventRecord({ esPrincipal: 0 })]);

    expect(await new GetCurrentEventUseCase(repository).execute()).toBeNull();
  });
});

describe('GetCurrentEventBrandingUseCase', () => {
  it('returns the name and logo of the running event', async () => {
    const repository = new FakeEventRepository([buildEventRecord()]);

    expect(await new GetCurrentEventBrandingUseCase(repository).execute()).toEqual({
      nombre: 'Rueda de Negocios',
      urlLogoEvento: '/uploads/logo.png',
    });
  });

  it('answers nulls rather than failing when no event is published', async () => {
    const repository = new FakeEventRepository([]);

    expect(await new GetCurrentEventBrandingUseCase(repository).execute()).toEqual({
      nombre: null,
      urlLogoEvento: null,
    });
  });
});

describe('GetCurrentEventConfigUseCase', () => {
  it('returns the operational numbers of the running event', async () => {
    const repository = new FakeEventRepository([buildEventRecord()]);

    const config = await new GetCurrentEventConfigUseCase(repository).execute();

    expect(config).toMatchObject({ id: 1, duracionReunion: 20, tiempoEntreReuniones: 5 });
  });

  it('fails when no event is published', async () => {
    await expect(
      new GetCurrentEventConfigUseCase(new FakeEventRepository([])).execute(),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('UpdateCurrentEventConfigUseCase', () => {
  it('writes only the submitted keys', async () => {
    const repository = new FakeEventRepository([buildEventRecord()]);

    await new UpdateCurrentEventConfigUseCase(repository).execute({ duracionReunion: 30 });

    expect(repository.patched).toEqual([{ id: 1, patch: { duracionReunion: 30 } }]);
  });

  it('ignores keys explicitly sent as undefined', async () => {
    const repository = new FakeEventRepository([buildEventRecord()]);

    await new UpdateCurrentEventConfigUseCase(repository).execute({
      duracionReunion: 30,
      tiempoEntreReuniones: undefined,
    });

    expect(repository.patched[0]?.patch).toEqual({ duracionReunion: 30 });
  });

  it('fails when no event is published', async () => {
    await expect(
      new UpdateCurrentEventConfigUseCase(new FakeEventRepository([])).execute({ duracionReunion: 30 }),
    ).rejects.toThrow(NotFoundError);
  });
});
