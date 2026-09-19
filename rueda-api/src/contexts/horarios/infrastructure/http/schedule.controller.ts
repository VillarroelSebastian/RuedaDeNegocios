import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import {
  type AuthenticatedUser,
  enrollmentOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import type { HourRange } from '../../../eventos/domain/services/meeting-hours.js';
import {
  ClearOwnBlocksUseCase,
  type DailyAvailabilityView,
  GetOwnDailyAvailabilityUseCase,
  ListOwnRangesUseCase,
  ListOwnSlotsUseCase,
  type OwnSlot,
  ReplaceOwnRangesUseCase,
  type SavedRanges,
  SaveOwnDailyAvailabilityUseCase,
  ToggleOwnSlotUseCase,
} from '../../application/use-cases/manage-availability.use-cases.js';
import {
  type AgendaView,
  GetAgendaUseCase,
  GetStaffAgendaUseCase,
} from '../../application/use-cases/read-agenda.use-cases.js';
import {
  AgendaQueryDto,
  ReplaceRangesDto,
  SaveDailyAvailabilityDto,
  StaffAgendaQueryDto,
  ToggleSlotDto,
} from './dto/schedule.dto.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

/**
 * When two companies can meet, and the hours each one is willing to meet in.
 *
 * Replaces `GET /empresa/horarios`, `GET /tecnico/horarios` and the six
 * `horarios-empresa` routes. Every one of them took the `eeId` from the query
 * or the body; here it always comes from the caller's own token.
 */
@Controller('schedule')
export class ScheduleController {
  constructor(
    private readonly getAgenda: GetAgendaUseCase,
    private readonly getStaffAgenda: GetStaffAgendaUseCase,
    private readonly listRanges: ListOwnRangesUseCase,
    private readonly replaceRanges: ReplaceOwnRangesUseCase,
    private readonly getDailyAvailability: GetOwnDailyAvailabilityUseCase,
    private readonly saveDailyAvailability: SaveOwnDailyAvailabilityUseCase,
    private readonly listSlots: ListOwnSlotsUseCase,
    private readonly clearBlocks: ClearOwnBlocksUseCase,
    private readonly toggleSlot: ToggleOwnSlotUseCase,
  ) {}

  /** The agenda between the caller and another company. */
  @Roles(ROLES.EMPRESA)
  @Get('agenda')
  agenda(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AgendaQueryDto,
  ): Promise<AgendaView> {
    return this.getAgenda.execute({
      companyEventId: enrollmentOf(user),
      receptoraId: query.receptoraId,
      excludeReunionId: query.excludeReunionId,
      solicitudId: query.solicitudId,
    });
  }

  /** The same agenda for the event team, which books on behalf of both sides. */
  @Roles(...STAFF)
  @Get('staff-agenda')
  staffAgenda(@Query() query: StaffAgendaQueryDto): Promise<AgendaView> {
    return this.getStaffAgenda.execute({
      companyEventId: query.solicitanteId,
      receptoraId: query.receptoraId,
      excludeReunionId: query.excludeReunionId,
      solicitudId: query.solicitudId,
    });
  }

  @Roles(ROLES.EMPRESA)
  @Get('availability/ranges')
  ranges(@CurrentUser() user: AuthenticatedUser): Promise<HourRange[]> {
    return this.listRanges.execute(enrollmentOf(user));
  }

  /** Replaces the declared hours outright, which is what the screen does. */
  @Roles(ROLES.EMPRESA)
  @Put('availability/ranges')
  saveRanges(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplaceRangesDto,
  ): Promise<SavedRanges> {
    return this.replaceRanges.execute(enrollmentOf(user), dto.rangos);
  }

  @Roles(ROLES.EMPRESA)
  @Get('availability/days')
  days(@CurrentUser() user: AuthenticatedUser): Promise<DailyAvailabilityView> {
    return this.getDailyAvailability.execute(enrollmentOf(user));
  }

  /**
   * The days one company declared, read by the event team while it books on
   * behalf of both sides. It is the same reading as above, for somebody who is
   * allowed to see it without being that company.
   */
  @Roles(...STAFF)
  @Get('availability/days/:companyEventId')
  daysOf(
    @Param('companyEventId', ParseIntPipe) companyEventId: number,
  ): Promise<DailyAvailabilityView> {
    return this.getDailyAvailability.execute(companyEventId);
  }

  @Roles(ROLES.EMPRESA)
  @Put('availability/days')
  saveDays(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveDailyAvailabilityDto,
  ): Promise<DailyAvailabilityView> {
    return this.saveDailyAvailability.execute(enrollmentOf(user), dto.dias);
  }

  @Roles(ROLES.EMPRESA)
  @Get('availability/slots')
  slots(@CurrentUser() user: AuthenticatedUser): Promise<OwnSlot[]> {
    return this.listSlots.execute(enrollmentOf(user));
  }

  /** Frees every slot the company had blocked. */
  @Roles(ROLES.EMPRESA)
  @Delete('availability/slots')
  @HttpCode(HttpStatus.NO_CONTENT)
  clear(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.clearBlocks.execute(enrollmentOf(user));
  }

  @Roles(ROLES.EMPRESA)
  @Put('availability/slots/toggle')
  toggle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ToggleSlotDto,
  ): Promise<{ disponible: boolean }> {
    return this.toggleSlot.execute(enrollmentOf(user), dto.inicio, dto.fin);
  }
}
