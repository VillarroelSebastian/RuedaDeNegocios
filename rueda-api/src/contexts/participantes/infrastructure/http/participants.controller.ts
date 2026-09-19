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
} from '@nestjs/common';
import {
  type AuthenticatedUser,
  enrollmentOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  type AddParticipantResult,
  AddParticipantUseCase,
} from '../../application/use-cases/add-participant.use-case.js';
import { GetRosterUseCase, type RosterView } from '../../application/use-cases/get-roster.use-case.js';
import {
  type IssuedPassword,
  IssueTemporaryPasswordUseCase,
} from '../../application/use-cases/issue-temporary-password.use-case.js';
import { RemoveParticipantUseCase } from '../../application/use-cases/remove-participant.use-case.js';
import { AddParticipantDto, IssueTemporaryPasswordDto } from './dto/participant.dto.js';

@Controller('participants')
export class ParticipantsController {
  constructor(
    private readonly getRoster: GetRosterUseCase,
    private readonly addParticipant: AddParticipantUseCase,
    private readonly removeParticipant: RemoveParticipantUseCase,
    private readonly issuePassword: IssueTemporaryPasswordUseCase,
  ) {}

  /** Replaces `GET /empresa/participantes?eeId=`. */
  @Roles(ROLES.EMPRESA)
  @Get()
  roster(@CurrentUser() user: AuthenticatedUser): Promise<RosterView> {
    return this.getRoster.execute(enrollmentOf(user));
  }

  /** Replaces `POST /empresa/participantes`. */
  @Roles(ROLES.EMPRESA)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddParticipantDto,
  ): Promise<AddParticipantResult> {
    return this.addParticipant.execute({
      companyEventId: enrollmentOf(user),
      userId: user.id,
      nombres: dto.nombres,
      apellidoPaterno: dto.apellidoPaterno,
      email: dto.email,
      telefono: dto.telefono,
      cargo: dto.cargo,
    });
  }

  /** Replaces `PUT /empresa/participantes/:euId/desactivar`. */
  @Roles(ROLES.EMPRESA)
  @Delete(':companyUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('companyUserId', ParseIntPipe) companyUserId: number,
  ): Promise<void> {
    return this.removeParticipant.execute({
      companyEventId: enrollmentOf(user),
      userId: user.id,
      companyUserId,
    });
  }

  /**
   * Issues a new password for a participant who lost access. Replaces
   * `PUT /admin/participantes/:usuarioId/password-temporal`.
   */
  @Roles(ROLES.ADMIN)
  @Post(':userId/temporary-password')
  temporaryPassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: IssueTemporaryPasswordDto,
  ): Promise<IssuedPassword> {
    return this.issuePassword.execute({ userId, nuevaContrasenia: dto.nuevaContrasenia });
  }
}

/** The caller's own enrollment, taken from the token rather than the request. */
