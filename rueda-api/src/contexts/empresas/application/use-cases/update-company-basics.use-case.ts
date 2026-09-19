import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_REPOSITORY,
  type CompanyBasicsPatch,
  type CompanyDossier,
  type CompanyRepositoryPort,
} from '../../domain/ports/company.repository.port.js';

@Injectable()
export class UpdateCompanyBasicsUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(companyId: number, patch: CompanyBasicsPatch): Promise<CompanyDossier> {
    const existing = await this.companies.findDossier(companyId);
    if (!existing) throw new NotFoundError('La empresa no existe.');

    const updated = await this.companies.updateBasics(companyId, patch);
    if (!updated) throw new NotFoundError('La empresa no existe.');
    return updated;
  }
}
