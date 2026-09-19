import { Controller, Get } from '@nestjs/common';
import {
  type AuthenticatedUser,
  enrollmentOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  ListEventPairingsUseCase,
  ListMyOpportunitiesUseCase,
  type OpportunityMatch,
} from '../../application/use-cases/list-opportunities.use-cases.js';
import type { Pairing } from '../../domain/services/opportunity-pairings.js';

/**
 * Who is worth meeting, and why. Simple keyword and sector rules — no model
 * behind it — meant as support for deciding whom to sit down with.
 *
 * Replaces `GET /empresa/oportunidades` and `GET /staff/oportunidades`. The
 * legacy company route took the enrollment from the query string, so any
 * company could read another one's recommendations; it now comes from the token.
 */
@Controller('opportunities')
export class OpportunitiesController {
  constructor(
    private readonly listMine: ListMyOpportunitiesUseCase,
    private readonly listPairings: ListEventPairingsUseCase,
  ) {}

  @Roles(ROLES.EMPRESA)
  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser): Promise<OpportunityMatch[]> {
    return this.listMine.execute(enrollmentOf(user));
  }

  /** The meetings the event team should push, across the whole event. */
  @Roles(ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS)
  @Get('pairings')
  pairings(): Promise<Pairing[]> {
    return this.listPairings.execute();
  }
}
