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
} from '@nestjs/common';
import {
  type AuthenticatedUser,
  enrollmentOf,
  membershipOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import { ListMeetingRequestsUseCase } from '../../application/use-cases/list-requests.use-case.js';
import {
  AcceptMeetingRequestUseCase,
  type AcceptedRequest,
  CancelMeetingRequestUseCase,
  CreateMeetingRequestUseCase,
  EditMeetingRequestUseCase,
  RejectMeetingRequestUseCase,
} from '../../application/use-cases/manage-requests.use-cases.js';
import type {
  MeetingRequestRecord,
  MeetingRequestView,
} from '../../domain/ports/meeting-requests.repository.port.js';
import {
  CreateMeetingRequestDto,
  EditMeetingRequestDto,
  RejectMeetingRequestDto,
} from './dto/meeting-request.dto.js';

/**
 * A company asking another one to meet.
 *
 * Replaces `POST|GET /empresa/solicitudes` and the four
 * `PUT /empresa/solicitudes/:id/...` routes. Each decision is its own resource,
 * so accepting is no longer an action name in a path.
 *
 * Every legacy route carried the acting `eeId` in its body; here it comes from
 * the token, and so does the membership answering for the request.
 */
@Roles(ROLES.EMPRESA)
@Controller('meeting-requests')
export class MeetingRequestsController {
  constructor(
    private readonly listRequests: ListMeetingRequestsUseCase,
    private readonly createRequest: CreateMeetingRequestUseCase,
    private readonly editRequest: EditMeetingRequestUseCase,
    private readonly acceptRequest: AcceptMeetingRequestUseCase,
    private readonly rejectRequest: RejectMeetingRequestUseCase,
    private readonly cancelRequest: CancelMeetingRequestUseCase,
  ) {}

  /** Everything the company is part of, sent and received alike. */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<MeetingRequestView[]> {
    return this.listRequests.execute(enrollmentOf(user));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMeetingRequestDto,
  ): Promise<MeetingRequestRecord> {
    return this.createRequest.execute({
      solicitanteId: enrollmentOf(user),
      companyUserId: membershipOf(user),
      receptoraId: dto.receptoraId,
      tipo: dto.tipo,
      inicio: dto.inicio,
      fin: dto.fin,
      mesaId: dto.mesaId,
      mensaje: dto.mensaje,
    });
  }

  @Put(':requestId')
  edit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: EditMeetingRequestDto,
  ): Promise<MeetingRequestRecord> {
    return this.editRequest.execute(requestId, {
      solicitanteId: enrollmentOf(user),
      tipo: dto.tipo,
      inicio: dto.inicio,
      fin: dto.fin,
      mesaId: dto.mesaId,
      mensaje: dto.mensaje,
    });
  }

  /** Accepting is what turns the request into a meeting both sides must attend. */
  @Put(':requestId/acceptance')
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId', ParseIntPipe) requestId: number,
  ): Promise<AcceptedRequest> {
    return this.acceptRequest.execute(requestId, enrollmentOf(user));
  }

  @Put(':requestId/rejection')
  @HttpCode(HttpStatus.NO_CONTENT)
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: RejectMeetingRequestDto,
  ): Promise<void> {
    return this.rejectRequest.execute(requestId, enrollmentOf(user), dto.motivo);
  }

  @Put(':requestId/cancellation')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId', ParseIntPipe) requestId: number,
  ): Promise<void> {
    return this.cancelRequest.execute(requestId, enrollmentOf(user));
  }
}
