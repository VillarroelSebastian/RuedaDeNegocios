import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_REPOSITORY,
  type CompanyRepositoryPort,
  type DirectoryEntry,
} from '../../domain/ports/company.repository.port.js';
import { affinityBetween } from '../../domain/services/sector-affinity.js';

@Injectable()
export class GetDirectoryEntryUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(companyEventId: number, viewerCompanyEventId?: number): Promise<DirectoryEntry> {
    const row = await this.companies.findDirectoryEntry(companyEventId);
    if (!row) throw new NotFoundError('La empresa no participa en este evento.');

    // Staff viewing a profile has no sector of its own, so no affinity is shown.
    const viewerSector = viewerCompanyEventId
      ? await this.companies.findSector(viewerCompanyEventId)
      : null;

    return { ...row, afinidad: affinityBetween(viewerSector, row.rubro) };
  }
}
