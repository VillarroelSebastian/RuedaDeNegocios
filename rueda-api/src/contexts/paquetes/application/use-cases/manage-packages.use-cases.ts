import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import {
  PACKAGES_REPOSITORY,
  type OwnPackageView,
  type PackageRecord,
  type PackageUsage,
  type PackagesRepositoryPort,
} from '../../domain/ports/packages.repository.port.js';
import {
  type PackageDefinitionInput,
  sanitizePackageDefinition,
} from '../../domain/services/package-definition.js';

const NO_EVENT = 'No hay un evento principal activo.';
const NOT_FOUND = 'El paquete no existe o ya fue eliminado.';

/** What a company chooses from when it registers. */
@Injectable()
export class ListPackagesUseCase {
  constructor(@Inject(PACKAGES_REPOSITORY) private readonly packages: PackagesRepositoryPort) {}

  async execute(eventId?: number): Promise<PackageRecord[]> {
    const event = await this.packages.findAdministrableEventId(eventId);
    return event ? this.packages.list(event) : [];
  }
}

/**
 * The same packages with how many companies and sponsors bought each one. It is
 * a separate resource because the catalogue is public and those counts are not.
 */
@Injectable()
export class ListPackageUsageUseCase {
  constructor(@Inject(PACKAGES_REPOSITORY) private readonly packages: PackagesRepositoryPort) {}

  async execute(eventId?: number): Promise<PackageUsage[]> {
    const event = await this.packages.findAdministrableEventId(eventId);
    return event ? this.packages.listWithUsage(event) : [];
  }
}

@Injectable()
export class CreatePackageUseCase {
  constructor(@Inject(PACKAGES_REPOSITORY) private readonly packages: PackagesRepositoryPort) {}

  async execute(input: PackageDefinitionInput, eventId?: number): Promise<PackageRecord> {
    const event = await this.packages.findAdministrableEventId(eventId);
    if (!event) throw new ValidationError(NO_EVENT);

    return this.packages.create(event, sanitizePackageDefinition(input));
  }
}

@Injectable()
export class UpdatePackageUseCase {
  constructor(@Inject(PACKAGES_REPOSITORY) private readonly packages: PackagesRepositoryPort) {}

  async execute(packageId: number, input: PackageDefinitionInput): Promise<PackageRecord> {
    const existing = await this.packages.find(packageId);
    if (!existing) throw new NotFoundError(NOT_FOUND);

    return this.packages.update(packageId, sanitizePackageDefinition(input));
  }
}

/**
 * Retires a package. Two things stop it: the running event may never be left
 * without one to register with, and a package companies already bought cannot
 * be taken away from under them.
 */
@Injectable()
export class DeletePackageUseCase {
  constructor(@Inject(PACKAGES_REPOSITORY) private readonly packages: PackagesRepositoryPort) {}

  async execute(packageId: number): Promise<void> {
    const existing = await this.packages.find(packageId);
    if (!existing) throw new NotFoundError(NOT_FOUND);

    if (await this.packages.isPrincipal(existing.eventId)) {
      const active = await this.packages.countActive(existing.eventId);
      if (active <= 1) {
        throw new ConflictError('El evento principal debe conservar al menos un paquete activo.');
      }
    }

    const sold = await this.packages.countEnrollments(packageId);
    if (sold > 0) {
      throw new ConflictError(
        `No se puede eliminar: ${sold} empresa(s) ya se inscribieron con este paquete.`,
      );
    }

    await this.packages.deactivate(packageId);
  }
}

/** What the company bought, and how much of it is still free. */
@Injectable()
export class GetOwnPackageUseCase {
  constructor(@Inject(PACKAGES_REPOSITORY) private readonly packages: PackagesRepositoryPort) {}

  async execute(companyEventId: number): Promise<OwnPackageView> {
    const own = await this.packages.findOwnPackage(companyEventId);
    if (!own) throw new NotFoundError('Inscripción no encontrada');

    return own;
  }
}
