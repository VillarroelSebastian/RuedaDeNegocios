import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_REPOSITORY,
  type CompanyDossier,
  type CompanyRepositoryPort,
} from '../../domain/ports/company.repository.port.js';

@Injectable()
export class GetCompanyDossierUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(companyId: number): Promise<CompanyDossier> {
    const dossier = await this.companies.findDossier(companyId);
    if (!dossier) throw new NotFoundError('La empresa no existe.');
    return dossier;
  }
}
