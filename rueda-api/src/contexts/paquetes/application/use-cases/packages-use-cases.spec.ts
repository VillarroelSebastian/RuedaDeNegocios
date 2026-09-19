import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  EVENT_ID,
  FakePackagesRepository,
  type FakePackagesOptions,
  PACKAGE_ID,
} from '../../test-doubles.js';
import {
  CreatePackageUseCase,
  DeletePackageUseCase,
  GetOwnPackageUseCase,
  ListPackageUsageUseCase,
  ListPackagesUseCase,
  UpdatePackageUseCase,
} from './manage-packages.use-cases.js';

const DEFINITION = { nombre: 'Paquete Beni', costo: 1500, credencialesIncluidas: 2 };

function build(options: FakePackagesOptions = {}) {
  const repository = new FakePackagesRepository(options);
  return {
    repository,
    list: new ListPackagesUseCase(repository),
    usage: new ListPackageUsageUseCase(repository),
    create: new CreatePackageUseCase(repository),
    update: new UpdatePackageUseCase(repository),
    remove: new DeletePackageUseCase(repository),
    own: new GetOwnPackageUseCase(repository),
  };
}

describe('ListPackagesUseCase', () => {
  it('hands back the catalogue of the event', async () => {
    const { list } = build();

    expect(await list.execute()).toHaveLength(1);
  });

  it('answers with an empty catalogue while no event is running', async () => {
    const { list } = build({ eventId: null });

    expect(await list.execute()).toEqual([]);
  });
});

describe('ListPackageUsageUseCase', () => {
  it('adds how many companies and sponsors bought each package', async () => {
    const { usage } = build();

    const packages = await usage.execute();

    expect(packages[0]?.empresas).toBe(4);
    expect(packages[0]?.auspiciadores).toBe(1);
  });
});

describe('CreatePackageUseCase', () => {
  it('stores a sanitised package against the event', async () => {
    const { create, repository } = build();

    await create.execute({ ...DEFINITION, nombre: '  Paquete  Beni  ' });

    expect(repository.created[0]?.eventId).toBe(EVENT_ID);
    expect(repository.created[0]?.definition.nombre).toBe('Paquete Beni');
  });

  it('refuses while no event is configured', async () => {
    const { create } = build({ eventId: null });

    await expect(create.execute(DEFINITION)).rejects.toThrow(
      'No hay un evento principal activo.',
    );
  });

  it('refuses a package that includes no credentials', async () => {
    const { create } = build();

    await expect(
      create.execute({ ...DEFINITION, credencialesIncluidas: 0 }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('UpdatePackageUseCase', () => {
  it('rewrites the package', async () => {
    const { update, repository } = build();

    await update.execute(PACKAGE_ID, { ...DEFINITION, nombre: 'Paquete Mamoré' });

    expect(repository.updated[0]?.definition.nombre).toBe('Paquete Mamoré');
  });

  it('refuses a package that is not there', async () => {
    const { update } = build({ existing: null });

    await expect(update.execute(404, DEFINITION)).rejects.toThrow(NotFoundError);
  });
});

describe('DeletePackageUseCase', () => {
  it('retires the package instead of erasing it', async () => {
    const { remove, repository } = build();

    await remove.execute(PACKAGE_ID);

    expect(repository.deactivated).toEqual([PACKAGE_ID]);
  });

  /** A company registering has to have something to choose. */
  it('refuses to leave the running event without a package', async () => {
    const { remove } = build({ principal: true, active: 1 });

    await expect(remove.execute(PACKAGE_ID)).rejects.toThrow(
      'El evento principal debe conservar al menos un paquete activo.',
    );
  });

  it('lets another event be left without packages', async () => {
    const { remove, repository } = build({ principal: false, active: 1 });

    await remove.execute(PACKAGE_ID);

    expect(repository.deactivated).toEqual([PACKAGE_ID]);
  });

  /** Taking it away would leave those registrations pointing at nothing. */
  it('refuses a package companies already bought', async () => {
    const { remove } = build({ enrollments: 4 });

    await expect(remove.execute(PACKAGE_ID)).rejects.toThrow(
      'No se puede eliminar: 4 empresa(s) ya se inscribieron con este paquete.',
    );
  });

  it('refuses a package that is not there', async () => {
    const { remove } = build({ existing: null });

    await expect(remove.execute(404)).rejects.toThrow(NotFoundError);
  });
});

describe('GetOwnPackageUseCase', () => {
  it('shows what the company bought and how much is left', async () => {
    const { own } = build();

    const view = await own.execute(100);

    expect(view.beneficios).toEqual(['Podcast', 'Pantalla LED']);
    expect(view.participantesUsados).toBe(3);
    expect(view.participantesDisponibles).toBe(1);
  });

  it('refuses an enrollment that is not there', async () => {
    const { own } = build({ own: null });

    await expect(own.execute(404)).rejects.toThrow('Inscripción no encontrada');
  });
});
