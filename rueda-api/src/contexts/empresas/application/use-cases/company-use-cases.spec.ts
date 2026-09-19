import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  FakeCompanyRepository,
  buildDirectoryRow,
  buildOwnCompanyView,
} from '../../test-doubles.js';
import { GetDirectoryEntryUseCase } from './get-directory-entry.use-case.js';
import { GetOwnCompanyUseCase } from './get-own-company.use-case.js';
import { ListCompaniesUseCase } from './list-companies.use-case.js';
import { ListDirectoryUseCase } from './list-directory.use-case.js';
import { RemoveCompanyFromEventUseCase } from './remove-company-from-event.use-case.js';
import { UpdateCommercialProfileUseCase } from './update-commercial-profile.use-case.js';
import { UpdateCompanyLogoUseCase } from './update-company-logo.use-case.js';
import { UpdateOwnProfileUseCase } from './update-own-profile.use-case.js';

describe('ListCompaniesUseCase', () => {
  it('applies the default page and size', async () => {
    const repository = new FakeCompanyRepository();

    await new ListCompaniesUseCase(repository).execute({});

    expect(repository.listCalls[0]).toMatchObject({ page: 1, limit: 10 });
  });

  it('keeps a valid page and size', async () => {
    const repository = new FakeCompanyRepository();

    await new ListCompaniesUseCase(repository).execute({ page: 3, limit: 25 });

    expect(repository.listCalls[0]).toMatchObject({ page: 3, limit: 25 });
  });

  it('clamps a page below one', async () => {
    const repository = new FakeCompanyRepository();

    await new ListCompaniesUseCase(repository).execute({ page: 0 });

    expect(repository.listCalls[0]?.page).toBe(1);
  });

  it('caps the page size, so one request cannot pull the whole table', async () => {
    const repository = new FakeCompanyRepository();

    await new ListCompaniesUseCase(repository).execute({ limit: 5000 });

    expect(repository.listCalls[0]?.limit).toBe(100);
  });

  it('forwards the filters untouched', async () => {
    const repository = new FakeCompanyRepository();

    await new ListCompaniesUseCase(repository).execute({
      search: 'beni',
      estadoPago: 'COMPLETADO',
      ciudad: 'Trinidad',
      rubro: 'Agro',
    });

    expect(repository.listCalls[0]).toMatchObject({
      search: 'beni',
      estadoPago: 'COMPLETADO',
      ciudad: 'Trinidad',
      rubro: 'Agro',
    });
  });
});

describe('RemoveCompanyFromEventUseCase', () => {
  it('deactivates the enrollment and reports what it touched', async () => {
    const repository = new FakeCompanyRepository();

    const result = await new RemoveCompanyFromEventUseCase(repository).execute(5);

    expect(repository.deactivated).toEqual([5]);
    expect(result).toEqual({ enrollments: 1, participants: 2 });
  });

  it('fails when the company has no active enrollment left', async () => {
    const repository = new FakeCompanyRepository();
    repository.deactivateEnrollment = async () => ({ enrollments: 0, participants: 0 });

    await expect(new RemoveCompanyFromEventUseCase(repository).execute(5)).rejects.toThrow(
      /ya no está activa en este evento/,
    );
  });
});

describe('GetOwnCompanyUseCase', () => {
  it('returns the caller own membership', async () => {
    const repository = new FakeCompanyRepository({ ownCompany: buildOwnCompanyView() });

    expect((await new GetOwnCompanyUseCase(repository).execute(1)).empresaUsuarioId).toBe(10);
  });

  it('fails when the caller has no membership in the running event', async () => {
    await expect(new GetOwnCompanyUseCase(new FakeCompanyRepository()).execute(1)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('UpdateCommercialProfileUseCase', () => {
  it('lets the person in charge edit the commercial profile', async () => {
    const repository = new FakeCompanyRepository({ ownCompany: buildOwnCompanyView() });

    await new UpdateCommercialProfileUseCase(repository).execute(1, { oferta: '  Granos  ' });

    expect(repository.commercialPatches).toEqual([
      { companyId: 5, patch: { oferta: 'Granos', demanda: null, interesesBusqueda: null } },
    ]);
  });

  it('turns a blank value into null', async () => {
    const repository = new FakeCompanyRepository({ ownCompany: buildOwnCompanyView() });

    await new UpdateCommercialProfileUseCase(repository).execute(1, { oferta: '   ' });

    expect(repository.commercialPatches[0]?.patch.oferta).toBeNull();
  });

  it('refuses a member who is not in charge', async () => {
    const repository = new FakeCompanyRepository({
      ownCompany: buildOwnCompanyView({ esResponsable: false }),
    });

    await expect(
      new UpdateCommercialProfileUseCase(repository).execute(1, { oferta: 'Granos' }),
    ).rejects.toThrow(ForbiddenError);
    expect(repository.commercialPatches).toEqual([]);
  });

  it('never writes to a company the caller does not belong to', async () => {
    const repository = new FakeCompanyRepository({ ownCompany: buildOwnCompanyView() });

    await new UpdateCommercialProfileUseCase(repository).execute(1, { oferta: 'Granos' });

    // The company id comes from the caller's own membership, never from input.
    expect(repository.commercialPatches[0]?.companyId).toBe(5);
  });
});

describe('UpdateCompanyLogoUseCase', () => {
  it('lets the person in charge change the logo', async () => {
    const repository = new FakeCompanyRepository({ ownCompany: buildOwnCompanyView() });

    await new UpdateCompanyLogoUseCase(repository).execute(1, '/uploads/logos/beni.png');

    expect(repository.logoUpdates).toEqual([{ companyId: 5, url: '/uploads/logos/beni.png' }]);
  });

  it('truncates a url longer than the column', async () => {
    const repository = new FakeCompanyRepository({ ownCompany: buildOwnCompanyView() });

    await new UpdateCompanyLogoUseCase(repository).execute(1, 'x'.repeat(600));

    expect(repository.logoUpdates[0]?.url).toHaveLength(500);
  });

  it('refuses a member who is not in charge', async () => {
    const repository = new FakeCompanyRepository({
      ownCompany: buildOwnCompanyView({ esResponsable: false }),
    });

    await expect(
      new UpdateCompanyLogoUseCase(repository).execute(1, '/uploads/logos/beni.png'),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('UpdateOwnProfileUseCase', () => {
  it('writes the per-event identity of the caller', async () => {
    const repository = new FakeCompanyRepository({ ownCompany: buildOwnCompanyView() });

    await new UpdateOwnProfileUseCase(repository).execute(1, { nombres: 'Anita' });

    expect(repository.profilePatches).toEqual([{ companyUserId: 10, patch: { nombres: 'Anita' } }]);
  });

  it('fails when the caller has no membership', async () => {
    await expect(
      new UpdateOwnProfileUseCase(new FakeCompanyRepository()).execute(1, { nombres: 'Anita' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('ListDirectoryUseCase', () => {
  it('rates each entry against the caller sector and orders by affinity', async () => {
    const repository = new FakeCompanyRepository({
      sector: 'Agroindustria',
      directory: [
        buildDirectoryRow({ empresaeventoId: 101, nombre: 'Sin afinidad', rubro: 'Turismo' }),
        buildDirectoryRow({ empresaeventoId: 102, nombre: 'Misma', rubro: 'Agroindustria' }),
        buildDirectoryRow({
          empresaeventoId: 103,
          nombre: 'Complementaria',
          rubro: 'Logística, Transporte y Comercio Exterior',
        }),
      ],
    });

    const entries = await new ListDirectoryUseCase(repository).execute(100, {});

    expect(entries.map((entry) => entry.nombre)).toEqual([
      'Misma',
      'Complementaria',
      'Sin afinidad',
    ]);
    expect(entries[0].afinidad).toBe('alta');
    expect(entries[1].afinidad).toBe('media');
    expect(entries[2].afinidad).toBeNull();
  });

  it('returns an empty directory without failing when nothing matches', async () => {
    expect(await new ListDirectoryUseCase(new FakeCompanyRepository()).execute(100, {})).toEqual([]);
  });
});

describe('GetDirectoryEntryUseCase', () => {
  it('returns the entry rated against the viewer sector', async () => {
    const repository = new FakeCompanyRepository({
      sector: 'Agroindustria',
      directoryEntry: buildDirectoryRow({ rubro: 'Agroindustria' }),
    });

    expect((await new GetDirectoryEntryUseCase(repository).execute(101, 100)).afinidad).toBe('alta');
  });

  it('rates without affinity when the viewer is not supplied', async () => {
    const repository = new FakeCompanyRepository({
      sector: 'Agroindustria',
      directoryEntry: buildDirectoryRow({ rubro: 'Agroindustria' }),
    });

    expect((await new GetDirectoryEntryUseCase(repository).execute(101)).afinidad).toBeNull();
  });

  it('fails for an unknown enrollment', async () => {
    await expect(
      new GetDirectoryEntryUseCase(new FakeCompanyRepository()).execute(999),
    ).rejects.toThrow(NotFoundError);
  });
});
