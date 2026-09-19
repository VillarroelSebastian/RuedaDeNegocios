import { Inject, Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_REPOSITORY,
  type CompanyRepositoryPort,
} from '../../domain/ports/company.repository.port.js';

export interface RemovalSummary {
  enrollments: number;
  participants: number;
}

/**
 * Removes a company from the running event. Everything is deactivated rather
 * than deleted, and accounts survive if they still belong to another company.
 */
@Injectable()
export class RemoveCompanyFromEventUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(companyId: number): Promise<RemovalSummary> {
    const summary = await this.companies.deactivateEnrollment(companyId);
    if (summary.enrollments === 0) {
      throw new ConflictError('La empresa ya no está activa en este evento.');
    }
    return summary;
  }
}
