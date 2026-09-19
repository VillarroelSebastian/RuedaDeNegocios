import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_REPOSITORY,
  type CommercialProfile,
  type CompanyRepositoryPort,
} from '../../domain/ports/company.repository.port.js';

export interface UpdateCommercialProfileCommand {
  oferta?: string;
  demanda?: string;
  interesesBusqueda?: string;
}

/** Offer, demand and search interests feed the directory and the matchmaking. */
@Injectable()
export class UpdateCommercialProfileUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  async execute(userId: number, command: UpdateCommercialProfileCommand): Promise<CommercialProfile> {
    const own = await this.companies.findOwnCompany(userId);
    if (!own) throw new NotFoundError('No se encontró una empresa para esta cuenta.');
    if (!own.esResponsable) {
      throw new ForbiddenError('Solo el encargado puede editar la ficha comercial de la empresa.');
    }

    // The target company comes from the caller's own membership, so this route
    // cannot be pointed at someone else's record.
    return this.companies.updateCommercialProfile(own.empresa.id, {
      oferta: blankToNull(command.oferta),
      demanda: blankToNull(command.demanda),
      interesesBusqueda: blankToNull(command.interesesBusqueda),
    });
  }
}

function blankToNull(value: string | undefined): string | null {
  return value?.trim() || null;
}
