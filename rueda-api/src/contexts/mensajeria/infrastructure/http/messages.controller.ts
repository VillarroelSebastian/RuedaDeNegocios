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
import {
  type ConversationView,
  ListConversationsUseCase,
  MarkThreadReadUseCase,
  ReadThreadUseCase,
  SendCompanyMessageUseCase,
  SendStaffMessageUseCase,
} from '../../application/use-cases/messages.use-cases.js';
import type { MessageView } from '../../domain/ports/messages.repository.port.js';
import { SendMessageDto, SendStaffMessageDto } from './dto/message.dto.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

/**
 * Companies writing to each other, and the event team writing to a company.
 *
 * Replaces `GET /empresa/mensajes/conversaciones`, `GET|POST /empresa/mensajes`
 * and `POST /staff/mensajes`.
 *
 * Opening a thread no longer marks it read on the way: that is its own
 * operation, so reading never writes. It is the same split the notification
 * bell already uses.
 */
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly listConversations: ListConversationsUseCase,
    private readonly readThread: ReadThreadUseCase,
    private readonly markThreadRead: MarkThreadReadUseCase,
    private readonly sendMessage: SendCompanyMessageUseCase,
    private readonly sendStaffMessage: SendStaffMessageUseCase,
  ) {}

  // The literal route is declared before the parametrised ones.

  @Roles(ROLES.EMPRESA)
  @Get()
  conversations(@CurrentUser() user: AuthenticatedUser): Promise<ConversationView[]> {
    return this.listConversations.execute(enrollmentOf(user));
  }

  @Roles(ROLES.EMPRESA)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ): Promise<{ id: number; fecha: Date }> {
    return this.sendMessage.execute({
      emisorEeId: enrollmentOf(user),
      companyUserId: membershipOf(user),
      receptorEeId: dto.receptorEeId,
      contenido: dto.contenido,
    });
  }

  /** The event team writing to a company. It travels one way. */
  @Roles(...STAFF)
  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  sendAsStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendStaffMessageDto,
  ): Promise<{ id: number; fecha: Date }> {
    return this.sendStaffMessage.execute({
      userId: user.id,
      receptorEeId: dto.receptorEeId,
      contenido: dto.contenido,
    });
  }

  @Roles(ROLES.EMPRESA)
  @Get(':otherId')
  thread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('otherId', ParseIntPipe) otherId: number,
  ): Promise<MessageView[]> {
    return this.readThread.execute(enrollmentOf(user), otherId);
  }

  @Roles(ROLES.EMPRESA)
  @Put(':otherId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  read(
    @CurrentUser() user: AuthenticatedUser,
    @Param('otherId', ParseIntPipe) otherId: number,
  ): Promise<void> {
    return this.markThreadRead.execute(enrollmentOf(user), otherId);
  }
}
