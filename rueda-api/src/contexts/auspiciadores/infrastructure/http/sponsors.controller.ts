import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Public } from '../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  CreateSponsorUseCase,
  type CreatedSponsor,
  DeleteSponsorUseCase,
  GetSponsorUseCase,
  ListSponsorsUseCase,
  UpdateSponsorUseCase,
} from '../../application/use-cases/manage-sponsors.use-cases.js';
import {
  CheckSponsorCredentialUseCase,
  ListSponsorAttendanceUseCase,
  ReadSponsorCredentialUseCase,
  RecordSponsorAttendanceUseCase,
  type SponsorAttendanceResult,
  type SponsorCredentialCheck,
  type SponsorCredentialView,
} from '../../application/use-cases/sponsor-attendance.use-cases.js';
import type {
  SponsorAttendanceRecord,
  SponsorRecord,
} from '../../domain/ports/sponsors.repository.port.js';
import {
  CheckSponsorCredentialQueryDto,
  RecordSponsorAttendanceDto,
  SaveSponsorDto,
  SponsorCredentialQueryDto,
} from './dto/sponsor.dto.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

/**
 * Companies that back the event, the people they send, and the badge each of
 * those people walks in with.
 *
 * Replaces the five `admin/auspiciadores` routes,
 * `GET /public/credencial-auspiciador/:id`,
 * `GET /tecnico/credenciales-auspiciador/verificar` and the two
 * `tecnico/asistencias-auspiciadores` routes.
 */
@Controller('sponsors')
export class SponsorsController {
  constructor(
    private readonly listSponsors: ListSponsorsUseCase,
    private readonly getSponsor: GetSponsorUseCase,
    private readonly createSponsor: CreateSponsorUseCase,
    private readonly updateSponsor: UpdateSponsorUseCase,
    private readonly deleteSponsor: DeleteSponsorUseCase,
    private readonly readCredential: ReadSponsorCredentialUseCase,
    private readonly checkCredential: CheckSponsorCredentialUseCase,
    private readonly recordAttendance: RecordSponsorAttendanceUseCase,
    private readonly listAttendance: ListSponsorAttendanceUseCase,
  ) {}

  // The literal routes are declared before the parametrised ones.

  @Roles(ROLES.ADMIN)
  @Get()
  list(): Promise<SponsorRecord[]> {
    return this.listSponsors.execute();
  }

  /** The badge itself, opened by whoever scans the QR. */
  @Public()
  @Get('credentials/:personId')
  credential(
    @Param('personId', ParseIntPipe) personId: number,
    @Query() query: SponsorCredentialQueryDto,
  ): Promise<SponsorCredentialView> {
    return this.readCredential.execute(personId, query.t);
  }

  /** What the team sees before deciding to let somebody in. */
  @Roles(...STAFF)
  @Get('attendance/check')
  check(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CheckSponsorCredentialQueryDto,
  ): Promise<SponsorCredentialCheck> {
    return this.checkCredential.execute(query.personaId, query.token, user.eventId);
  }

  @Roles(...STAFF)
  @Get('attendance')
  attendance(@CurrentUser() user: AuthenticatedUser): Promise<SponsorAttendanceRecord[]> {
    return this.listAttendance.execute(user.eventId);
  }

  @Roles(...STAFF)
  @Post('attendance')
  @HttpCode(HttpStatus.CREATED)
  record(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordSponsorAttendanceDto,
  ): Promise<SponsorAttendanceResult> {
    return this.recordAttendance.execute({
      personId: dto.personaId,
      token: dto.token,
      technicianId: user.id,
      technicianEventId: user.eventId,
    });
  }

  @Roles(ROLES.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: SaveSponsorDto): Promise<CreatedSponsor> {
    return this.createSponsor.execute(dto);
  }

  @Roles(ROLES.ADMIN)
  @Get(':sponsorId')
  detail(@Param('sponsorId', ParseIntPipe) sponsorId: number): Promise<SponsorRecord> {
    return this.getSponsor.execute(sponsorId);
  }

  @Roles(ROLES.ADMIN)
  @Put(':sponsorId')
  update(
    @Param('sponsorId', ParseIntPipe) sponsorId: number,
    @Body() dto: SaveSponsorDto,
  ): Promise<SponsorRecord> {
    return this.updateSponsor.execute(sponsorId, dto);
  }

  @Roles(ROLES.ADMIN)
  @Delete(':sponsorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('sponsorId', ParseIntPipe) sponsorId: number): Promise<void> {
    return this.deleteSponsor.execute(sponsorId);
  }
}
