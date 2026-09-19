import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_REPOSITORY,
  type CompanyRepositoryPort,
} from '../../domain/ports/company.repository.port.js';

/** Matches the width of `empresa.urlFotoPerfil`. */
const MAX_URL_LENGTH = 500;

@Injectable()
export class UpdateCompanyLogoUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(userId: number, url: string): Promise<{ id: number; urlFotoPerfil: string | null }> {
    const own = await this.companies.findOwnCompany(userId);
    if (!own) throw new NotFoundError('No se encontró una empresa para esta cuenta.');
    if (!own.esResponsable) {
      throw new ForbiddenError('Solo el encargado puede cambiar la imagen de la empresa.');
    }

    return this.companies.updateLogo(own.empresa.id, url.slice(0, MAX_URL_LENGTH));
  }
}
