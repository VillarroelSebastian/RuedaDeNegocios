import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_REPOSITORY,
  type CompanyRepositoryPort,
  type OwnCompanyView,
} from '../../domain/ports/company.repository.port.js';

/**
 * Everything a company user needs about itself. Replaces both
 * `GET /empresa/mi-empresa` and `GET /empresa/perfil`, which overlapped almost
 * entirely and both took the account id from the query string.
 */
@Injectable()
export class GetOwnCompanyUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(userId: number): Promise<OwnCompanyView> {
    const view = await this.companies.findOwnCompany(userId);
    if (!view) throw new NotFoundError('No se encontró una empresa para esta cuenta.');
    return view;
  }
}
