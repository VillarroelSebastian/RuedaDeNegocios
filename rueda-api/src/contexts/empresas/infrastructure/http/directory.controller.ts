import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/authenticated-user.js';
import { ForbiddenError } from '../../../../shared/domain/errors/domain.error.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import { GetDirectoryEntryUseCase } from '../../application/use-cases/get-directory-entry.use-case.js';
import { ListDirectoryUseCase } from '../../application/use-cases/list-directory.use-case.js';
import type { DirectoryEntry } from '../../domain/ports/company.repository.port.js';
import { DirectoryQueryDto } from './dto/company.dto.js';

/**
 * Catalogue of participating companies. Replaces `GET /empresa/directorio` and
 * the pair `GET /empresa/perfil-empresa/:eeId` + `GET /staff/empresas/:eeId/perfil`,
 * which were the same read exposed twice.
 */
@Controller('directory')
export class DirectoryController {
  constructor(
    private readonly listDirectory: ListDirectoryUseCase,
    private readonly getEntry: GetDirectoryEntryUseCase,
  ) {}

  @Roles(ROLES.EMPRESA)
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DirectoryQueryDto,
  ): Promise<DirectoryEntry[]> {
    return this.listDirectory.execute(viewerEnrollmentOf(user), query);
  }

  @Roles(ROLES.EMPRESA, ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS)
  @Get(':companyEventId')
  entry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyEventId', ParseIntPipe) companyEventId: number,
  ): Promise<DirectoryEntry> {
    // Staff has no enrollment of its own, so it sees the profile without a
    // relevance rating rather than someone else's rating.
    const viewer = user.role === ROLES.EMPRESA ? viewerEnrollmentOf(user) : undefined;
    return this.getEntry.execute(companyEventId, viewer);
  }
}

/** The caller's own enrollment, taken from the token rather than the query. */
function viewerEnrollmentOf(user: AuthenticatedUser): number {
  const [enrollmentId] = user.companyEventIds;
  if (!enrollmentId) {
    throw new ForbiddenError('Tu inscripción para el evento actual no está habilitada.');
  }
  return enrollmentId;
}
