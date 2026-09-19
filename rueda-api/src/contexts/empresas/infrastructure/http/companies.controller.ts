import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import { GetCompanyDossierUseCase } from '../../application/use-cases/get-company-dossier.use-case.js';
import { GetOwnCompanyUseCase } from '../../application/use-cases/get-own-company.use-case.js';
import { ListCompaniesUseCase } from '../../application/use-cases/list-companies.use-case.js';
import { ListCompanyParticipantsUseCase } from '../../application/use-cases/list-company-participants.use-case.js';
import {
  type RemovalSummary,
  RemoveCompanyFromEventUseCase,
} from '../../application/use-cases/remove-company-from-event.use-case.js';
import { UpdateCommercialProfileUseCase } from '../../application/use-cases/update-commercial-profile.use-case.js';
import { UpdateCompanyBasicsUseCase } from '../../application/use-cases/update-company-basics.use-case.js';
import { UpdateCompanyLogoUseCase } from '../../application/use-cases/update-company-logo.use-case.js';
import { UpdateOwnProfileUseCase } from '../../application/use-cases/update-own-profile.use-case.js';
import type {
  CommercialProfile,
  CompanyDossier,
  CompanyListItem,
  CompanyParticipant,
  OwnCompanyView,
  Paginated,
} from '../../domain/ports/company.repository.port.js';
import {
  ListCompaniesQueryDto,
  UpdateCommercialProfileDto,
  UpdateCompanyBasicsDto,
  UpdateCompanyLogoDto,
  UpdateOwnProfileDto,
} from './dto/company.dto.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly listCompanies: ListCompaniesUseCase,
    private readonly getDossier: GetCompanyDossierUseCase,
    private readonly updateBasics: UpdateCompanyBasicsUseCase,
    private readonly removeFromEvent: RemoveCompanyFromEventUseCase,
    private readonly listParticipants: ListCompanyParticipantsUseCase,
    private readonly getOwn: GetOwnCompanyUseCase,
    private readonly updateOwnProfile: UpdateOwnProfileUseCase,
    private readonly updateCommercial: UpdateCommercialProfileUseCase,
    private readonly updateLogo: UpdateCompanyLogoUseCase,
  ) {}

  // The `me` routes are declared first so `:id` never captures them.

  /** Replaces `GET /empresa/mi-empresa` and `GET /empresa/perfil`. */
  @Roles(ROLES.EMPRESA)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<OwnCompanyView> {
    return this.getOwn.execute(user.id);
  }

  @Roles(ROLES.EMPRESA)
  @Patch('me/profile')
  patchOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOwnProfileDto,
  ): Promise<OwnCompanyView['usuario']> {
    return this.updateOwnProfile.execute(user.id, dto);
  }

  @Roles(ROLES.EMPRESA)
  @Patch('me/commercial')
  patchCommercial(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommercialProfileDto,
  ): Promise<CommercialProfile> {
    return this.updateCommercial.execute(user.id, dto);
  }

  @Roles(ROLES.EMPRESA)
  @Patch('me/logo')
  patchLogo(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCompanyLogoDto) {
    return this.updateLogo.execute(user.id, dto.urlFotoPerfil);
  }

  /** Replaces `GET /admin/empresas` and `GET /tecnico/empresas`. */
  @Roles(...STAFF)
  @Get()
  list(@Query() query: ListCompaniesQueryDto): Promise<Paginated<CompanyListItem>> {
    return this.listCompanies.execute(query);
  }

  @Roles(...STAFF)
  @Get(':id')
  dossier(@Param('id', ParseIntPipe) id: number): Promise<CompanyDossier> {
    return this.getDossier.execute(id);
  }

  @Roles(...STAFF)
  @Patch(':id')
  patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyBasicsDto,
  ): Promise<CompanyDossier> {
    return this.updateBasics.execute(id, dto);
  }

  @Roles(...STAFF)
  @Get(':id/participants')
  participants(@Param('id', ParseIntPipe) id: number): Promise<CompanyParticipant[]> {
    return this.listParticipants.execute(id);
  }

  /** Withdraws a company from the running event. Nothing is deleted. */
  @Roles(ROLES.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<RemovalSummary> {
    return this.removeFromEvent.execute(id);
  }
}
