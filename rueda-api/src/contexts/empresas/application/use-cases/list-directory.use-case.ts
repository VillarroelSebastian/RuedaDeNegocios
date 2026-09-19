import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_REPOSITORY,
  type CompanyRepositoryPort,
  type DirectoryEntry,
  type DirectoryFilters,
} from '../../domain/ports/company.repository.port.js';
import { affinityBetween, compareByAffinity } from '../../domain/services/sector-affinity.js';

/**
 * Catalogue of participating companies, ranked so the counterparts worth
 * meeting appear first.
 */
@Injectable()
export class ListDirectoryUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(
    viewerCompanyEventId: number,
    filters: DirectoryFilters,
  ): Promise<DirectoryEntry[]> {
    const [viewerSector, rows] = await Promise.all([
      this.companies.findSector(viewerCompanyEventId),
      this.companies.listDirectory(viewerCompanyEventId, filters),
    ]);

    return rows
      .map((row) => ({ ...row, afinidad: affinityBetween(viewerSector, row.rubro) }))
      .sort(compareByAffinity);
  }
}
