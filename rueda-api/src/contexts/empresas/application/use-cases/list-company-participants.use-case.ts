import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_REPOSITORY,
  type CompanyParticipant,
  type CompanyRepositoryPort,
} from '../../domain/ports/company.repository.port.js';

@Injectable()
export class ListCompanyParticipantsUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  execute(companyId: number): Promise<CompanyParticipant[]> {
    return this.companies.findParticipants(companyId);
  }
}
