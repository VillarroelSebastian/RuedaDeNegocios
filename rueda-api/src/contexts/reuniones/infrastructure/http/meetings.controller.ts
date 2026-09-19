import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  type AuthenticatedUser,
  enrollmentOf,
  membershipOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  CancelOwnMeetingUseCase,
  CompleteOwnMeetingUseCase,
  ProposeRescheduleUseCase,
  RespondRescheduleUseCase,
  type StartResult,
  StartOwnMeetingUseCase,
} from '../../application/use-cases/company-meetings.use-cases.js';
import {
  type CompanyAgendaView,
  GetCompanyAgendaUseCase,
  GetMeetingUseCase,
  type IdleCompaniesView,
  ListEligibleCompaniesUseCase,
  ListIdleCompaniesUseCase,
  ListMeetingHistoryUseCase,
  ListMeetingsUseCase,
  ListOwnMeetingsUseCase,
} from '../../application/use-cases/read-meetings.use-cases.js';
import {
  ChangeMeetingStatusUseCase,
  type CreatedMeeting,
  CreateMeetingUseCase,
  EvaluateMeetingUseCase,
  MessageMeetingCompanyUseCase,
  SetMeetingLinkUseCase,
} from '../../application/use-cases/run-meetings.use-cases.js';
import {
  ListOwnMeetingResultsUseCase,
  RecordMeetingResultUseCase,
} from '../../application/use-cases/meeting-results.use-cases.js';
import type {
  CompanyBrief,
  MeetingResultView,
  MeetingView,
  OwnMeetingView,
  RescheduleProposal,
} from '../../domain/ports/meetings.repository.port.js';
import {
  CancelMeetingDto,
  CreateMeetingDto,
  EvaluateMeetingDto,
  ListMeetingsQueryDto,
  MeetingLinkDto,
  MeetingMessageDto,
  MeetingStatusDto,
  RecordResultDto,
  RescheduleDto,
  RespondRescheduleDto,
  SearchQueryDto,
} from './dto/meeting.dto.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

/**
 * Meetings, from the moment they are agreed until they are over.
 *
 * Replaces the eleven `tecnico|admin|staff` meeting routes and the six
 * `empresa/reuniones` ones, plus `admin/mesas/historial` and
 * `tecnico/mesas/historial`, which listed finished meetings rather than tables.
 *
 * The two legacy endpoints that changed a meeting's state are now one: the
 * admin version wrote whatever state it was handed, which is how a finished
 * meeting could be dragged back to booked and lose the hour it actually ran at.
 *
 * A meeting is born in the requests context, when a company accepts one. What
 * happens to it afterwards lives here.
 */
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly listMeetings: ListMeetingsUseCase,
    private readonly getMeeting: GetMeetingUseCase,
    private readonly listHistory: ListMeetingHistoryUseCase,
    private readonly listIdle: ListIdleCompaniesUseCase,
    private readonly listEligible: ListEligibleCompaniesUseCase,
    private readonly getCompanyAgenda: GetCompanyAgendaUseCase,
    private readonly listOwn: ListOwnMeetingsUseCase,
    private readonly createMeeting: CreateMeetingUseCase,
    private readonly changeStatus: ChangeMeetingStatusUseCase,
    private readonly setLink: SetMeetingLinkUseCase,
    private readonly messageCompany: MessageMeetingCompanyUseCase,
    private readonly evaluateMeeting: EvaluateMeetingUseCase,
    private readonly cancelOwn: CancelOwnMeetingUseCase,
    private readonly startOwn: StartOwnMeetingUseCase,
    private readonly completeOwn: CompleteOwnMeetingUseCase,
    private readonly proposeReschedule: ProposeRescheduleUseCase,
    private readonly respondReschedule: RespondRescheduleUseCase,
    private readonly listResults: ListOwnMeetingResultsUseCase,
    private readonly recordMeetingResult: RecordMeetingResultUseCase,
  ) {}

  // The literal routes are declared before the parametrised ones.

  @Roles(...STAFF)
  @Get()
  list(@Query() query: ListMeetingsQueryDto): Promise<MeetingView[]> {
    return this.listMeetings.execute(query);
  }

  /** The company's own meetings, the ones it asked for first. */
  @Roles(ROLES.EMPRESA)
  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser): Promise<OwnMeetingView[]> {
    return this.listOwn.execute(enrollmentOf(user));
  }

  /** What the company recorded about the meetings it took part in. */
  @Roles(ROLES.EMPRESA)
  @Get('results')
  results(@CurrentUser() user: AuthenticatedUser): Promise<MeetingResultView[]> {
    return this.listResults.execute(enrollmentOf(user));
  }

  @Roles(...STAFF)
  @Get('history')
  history(@Query() query: SearchQueryDto): Promise<MeetingView[]> {
    return this.listHistory.execute(query.q);
  }

  /** Who the team can walk up to right now, because they are not meeting. */
  @Roles(...STAFF)
  @Get('idle-companies')
  idleCompanies(): Promise<IdleCompaniesView> {
    return this.listIdle.execute();
  }

  @Roles(...STAFF)
  @Get('eligible-companies')
  eligibleCompanies(): Promise<CompanyBrief[]> {
    return this.listEligible.execute();
  }

  @Roles(...STAFF)
  @Get('agenda/:companyEventId')
  companyAgenda(
    @Param('companyEventId', ParseIntPipe) companyEventId: number,
  ): Promise<CompanyAgendaView> {
    return this.getCompanyAgenda.execute(companyEventId);
  }

  @Roles(...STAFF)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMeetingDto): Promise<CreatedMeeting> {
    return this.createMeeting.execute(dto);
  }

  /** The other company answering a proposed change of hour. */
  @Roles(ROLES.EMPRESA)
  @Put('reschedules/:changeId')
  respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param('changeId', ParseIntPipe) changeId: number,
    @Body() dto: RespondRescheduleDto,
  ): Promise<{ estado: string }> {
    return this.respondReschedule.execute(
      changeId,
      enrollmentOf(user),
      dto.aceptar,
      dto.motivo,
    );
  }

  @Roles(...STAFF)
  @Get(':meetingId')
  detail(@Param('meetingId', ParseIntPipe) meetingId: number): Promise<MeetingView> {
    return this.getMeeting.execute(meetingId);
  }

  @Roles(...STAFF)
  @Put(':meetingId/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  status(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: MeetingStatusDto,
  ): Promise<void> {
    return this.changeStatus.execute(meetingId, dto);
  }

  @Roles(...STAFF)
  @Put(':meetingId/link')
  link(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: MeetingLinkDto,
  ): Promise<{ enlace: string }> {
    return this.setLink.execute(meetingId, dto.enlace);
  }

  @Roles(...STAFF)
  @Post(':meetingId/messages')
  @HttpCode(HttpStatus.NO_CONTENT)
  message(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: MeetingMessageDto,
  ): Promise<void> {
    return this.messageCompany.execute(meetingId, dto.empresa, dto.mensaje);
  }

  /** Closes the meeting recording what both companies got out of it. */
  @Roles(...STAFF)
  @Post(':meetingId/evaluation')
  @HttpCode(HttpStatus.NO_CONTENT)
  evaluate(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: EvaluateMeetingDto,
  ): Promise<void> {
    return this.evaluateMeeting.execute(meetingId, dto);
  }

  @Roles(ROLES.EMPRESA)
  @Put(':meetingId/cancellation')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: CancelMeetingDto,
  ): Promise<void> {
    return this.cancelOwn.execute(meetingId, enrollmentOf(user), dto.motivo);
  }

  /** Once the hour has come one company is enough; before it, both must press. */
  @Roles(ROLES.EMPRESA)
  @Put(':meetingId/start')
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<StartResult> {
    return this.startOwn.execute(meetingId, enrollmentOf(user));
  }

  @Roles(ROLES.EMPRESA)
  @Put(':meetingId/completion')
  @HttpCode(HttpStatus.NO_CONTENT)
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
  ): Promise<void> {
    return this.completeOwn.execute(meetingId, enrollmentOf(user));
  }

  /** The company's own half of the record; the team can fill in both halves. */
  @Roles(ROLES.EMPRESA)
  @Post(':meetingId/result')
  @HttpCode(HttpStatus.CREATED)
  recordResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: RecordResultDto,
  ): Promise<{ id: number }> {
    return this.recordMeetingResult.execute({
      companyEventId: enrollmentOf(user),
      companyUserId: membershipOf(user),
      meetingId,
      calificacion: dto.calificacion,
      rango: dto.rango,
      observaciones: dto.observaciones,
    });
  }

  @Roles(ROLES.EMPRESA)
  @Post(':meetingId/reschedule')
  @HttpCode(HttpStatus.CREATED)
  reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: RescheduleDto,
  ): Promise<RescheduleProposal> {
    return this.proposeReschedule.execute(meetingId, enrollmentOf(user), dto);
  }
}
