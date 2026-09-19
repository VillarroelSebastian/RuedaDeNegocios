import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import { FakeEventRepository, FakeTableProvisioning, buildEventRecord } from '../../test-doubles.js';
import { CreateEventUseCase } from './create-event.use-case.js';
import { DeleteEventUseCase } from './delete-event.use-case.js';
import { GetEventUseCase } from './get-event.use-case.js';
import { ListEventsUseCase } from './list-events.use-case.js';
import { SetPrincipalEventUseCase } from './set-principal-event.use-case.js';
import { UpdateEventUseCase } from './update-event.use-case.js';

const FORM = {
  nombre: 'Rueda de Negocios IX',
  fechaInicioEvento: '2026-11-03T08:00',
  fechaFinEvento: '2026-11-04T18:00',
};

describe('ListEventsUseCase', () => {
  it('returns the active events', async () => {
    const repository = new FakeEventRepository([
      buildEventRecord({ id: 1 }),
      buildEventRecord({ id: 2, esPrincipal: 0, estaActivo: 0 }),
    ]);

    const events = await new ListEventsUseCase(repository).execute();

    expect(events.map((event) => event.id)).toEqual([1]);
  });
});

describe('GetEventUseCase', () => {
  it('returns the event with its QR rules', async () => {
    const repository = new FakeEventRepository([buildEventRecord({ id: 1 })]);

    expect((await new GetEventUseCase(repository).execute(1)).id).toBe(1);
  });

  it('rejects an unknown event instead of answering an empty object', async () => {
    const repository = new FakeEventRepository([]);

    await expect(new GetEventUseCase(repository).execute(9)).rejects.toThrow(NotFoundError);
  });
});

describe('CreateEventUseCase', () => {
  it('creates the event and provisions its tables', async () => {
    const repository = new FakeEventRepository([]);
    const tables = new FakeTableProvisioning();

    const created = await new CreateEventUseCase(repository, tables).execute(FORM);

    expect(repository.created).toHaveLength(1);
    expect(tables.calls).toEqual([
      { eventId: created.id, total: created.cantidadTotalMesasEvento, capacityPerTable: created.capacidadPersonasPorMesa },
    ]);
  });

  it('never publishes a new event automatically', async () => {
    const repository = new FakeEventRepository([]);

    const created = await new CreateEventUseCase(repository, new FakeTableProvisioning()).execute(FORM);

    expect(created.esPrincipal).toBe(0);
  });

  it('stores the submitted QR rules', async () => {
    const repository = new FakeEventRepository([]);

    await new CreateEventUseCase(repository, new FakeTableProvisioning()).execute({
      ...FORM,
      reglasQR: [{ rangoDesde: 1, rangoHasta: 5, monto: 500, urlQR: '/uploads/qr.png' }],
    });

    expect(repository.created[0]?.qrRules).toEqual([
      { rangoDesde: 1, rangoHasta: 5, monto: 500, urlQR: '/uploads/qr.png' },
    ]);
  });

  it('applies defaults to malformed QR rules rather than rejecting them', async () => {
    const repository = new FakeEventRepository([]);

    await new CreateEventUseCase(repository, new FakeTableProvisioning()).execute({
      ...FORM,
      reglasQR: [{ rangoDesde: 'x', rangoHasta: null, monto: undefined, urlQR: null }],
    });

    expect(repository.created[0]?.qrRules).toEqual([
      { rangoDesde: 1, rangoHasta: 1, monto: 0, urlQR: '' },
    ]);
  });
});

describe('UpdateEventUseCase', () => {
  it('updates the event and re-provisions its tables', async () => {
    const repository = new FakeEventRepository([buildEventRecord({ id: 1 })]);
    const tables = new FakeTableProvisioning();

    await new UpdateEventUseCase(repository, tables).execute(1, {
      ...FORM,
      cantidadTotalMesasEvento: 80,
      capacidadPersonasPorMesa: 6,
    });

    expect(repository.updated[0]?.id).toBe(1);
    expect(tables.calls).toEqual([{ eventId: 1, total: 80, capacityPerTable: 6 }]);
  });

  it('replaces the QR rules only when they are part of the request', async () => {
    const repository = new FakeEventRepository([buildEventRecord({ id: 1 })]);
    const useCase = new UpdateEventUseCase(repository, new FakeTableProvisioning());

    await useCase.execute(1, FORM);
    expect(repository.replacedQrRules).toEqual([]);

    await useCase.execute(1, { ...FORM, reglasQR: [] });
    expect(repository.replacedQrRules).toEqual([{ eventId: 1, qrRules: [] }]);
  });

  it('rejects an unknown event', async () => {
    const repository = new FakeEventRepository([]);

    await expect(
      new UpdateEventUseCase(repository, new FakeTableProvisioning()).execute(9, FORM),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('SetPrincipalEventUseCase', () => {
  it('promotes an event that already has a package', async () => {
    const repository = new FakeEventRepository([buildEventRecord({ id: 2, esPrincipal: 0 })], 1);

    await new SetPrincipalEventUseCase(repository).execute(2);

    expect(repository.madePrincipal).toEqual([2]);
  });

  it('refuses to publish an event with no registration package', async () => {
    const repository = new FakeEventRepository(
      [buildEventRecord({ id: 2, esPrincipal: 0, nombre: 'Rueda IX' })],
      0,
    );

    await expect(new SetPrincipalEventUseCase(repository).execute(2)).rejects.toThrow(
      /Configura al menos un paquete de inscripción para "Rueda IX"/,
    );
    expect(repository.madePrincipal).toEqual([]);
  });

  it('rejects an unknown or inactive event', async () => {
    const repository = new FakeEventRepository([buildEventRecord({ id: 2, estaActivo: 0 })]);

    await expect(new SetPrincipalEventUseCase(repository).execute(2)).rejects.toThrow(NotFoundError);
  });
});

describe('DeleteEventUseCase', () => {
  it('deactivates the event instead of deleting the row', async () => {
    const repository = new FakeEventRepository([buildEventRecord({ id: 2, esPrincipal: 0 })]);

    await new DeleteEventUseCase(repository).execute(2);

    expect(repository.deactivated).toEqual([2]);
  });

  it('refuses to remove the principal event', async () => {
    const repository = new FakeEventRepository([buildEventRecord({ id: 1, esPrincipal: 1 })]);

    await expect(new DeleteEventUseCase(repository).execute(1)).rejects.toThrow(ConflictError);
    expect(repository.deactivated).toEqual([]);
  });

  it('rejects an unknown event', async () => {
    await expect(new DeleteEventUseCase(new FakeEventRepository([])).execute(9)).rejects.toThrow(
      NotFoundError,
    );
  });
});
