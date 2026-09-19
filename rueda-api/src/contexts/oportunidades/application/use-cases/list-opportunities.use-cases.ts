import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  OPPORTUNITIES_REPOSITORY,
  type OpportunitiesRepositoryPort,
} from '../../domain/ports/opportunities.repository.port.js';
import { type MatchableCompany, reasonsToMeet } from '../../domain/services/opportunity-matching.js';
import { type Pairing, rankPairings } from '../../domain/services/opportunity-pairings.js';

/** A counterpart worth meeting, with why it is worth meeting. */
export interface OpportunityMatch extends MatchableCompany {
  motivos: string[];
}

/**
 * A company needs a list it can act on, not the other N-1 profiles of the event.
 * Every counterpart is still evaluated; only the best ones are answered.
 */
const MAX_MATCHES = 30;

@Injectable()
export class ListMyOpportunitiesUseCase {
  constructor(
    @Inject(OPPORTUNITIES_REPOSITORY) private readonly companies: OpportunitiesRepositoryPort,
  ) {}

  async execute(companyEventId: number): Promise<OpportunityMatch[]> {
    const mine = await this.companies.findCompany(companyEventId);
    if (!mine) throw new NotFoundError('Inscripción no encontrada');

    const granted = await this.companies.listGranted();

    return granted
      .filter((company) => company.empresaeventoId !== mine.empresaeventoId)
      .map((company) => ({ ...company, motivos: reasonsToMeet(mine, company) }))
      .filter((match) => match.motivos.length > 0)
      .sort(
        (left, right) =>
          right.motivos.length - left.motivos.length ||
          left.nombre.localeCompare(right.nombre, 'es'),
      )
      .slice(0, MAX_MATCHES);
  }
}

/** The meetings the event team should push, read across the whole event. */
@Injectable()
export class ListEventPairingsUseCase {
  constructor(
    @Inject(OPPORTUNITIES_REPOSITORY) private readonly companies: OpportunitiesRepositoryPort,
  ) {}

  async execute(): Promise<Pairing[]> {
    return rankPairings(await this.companies.listGranted());
  }
}
