import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_REPOSITORY,
  type CompanyRepositoryPort,
  type OwnCompanyView,
  type OwnProfilePatch,
} from '../../domain/ports/company.repository.port.js';

/**
 * Edits the caller's identity *for this event*, which is stored on the
 * membership rather than on the account, so the same person can appear
 * differently in different editions.
 */
@Injectable()
export class UpdateOwnProfileUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(userId: number, patch: OwnProfilePatch): Promise<OwnCompanyView['usuario']> {
    const own = await this.companies.findOwnCompany(userId);
    if (!own) throw new NotFoundError('No se encontró una empresa para esta cuenta.');

    return this.companies.updateOwnProfile(own.empresaUsuarioId, patch);
  }
}
