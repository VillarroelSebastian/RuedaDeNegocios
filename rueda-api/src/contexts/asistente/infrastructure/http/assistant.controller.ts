import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  type AuthenticatedUser,
  enrollmentOf,
  membershipOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import { AnswerAssistantUseCase } from '../../application/use-cases/answer-assistant.use-case.js';
import type { AssistantAnswer } from '../../domain/models/assistant-dialog.js';
import { AssistantMessageDto } from './dto/assistant.dto.js';

/**
 * The virtual assistant of a participating company.
 *
 * Replaces `POST /empresa/asistente`. The legacy route took the enrollment and
 * the member from the body, so one company could hold a conversation — and book
 * a meeting — as another; both now come from the token.
 */
@Controller('assistant')
export class AssistantController {
  constructor(private readonly answerAssistant: AnswerAssistantUseCase) {}

  /** A turn of the conversation. It answers, it does not create a resource. */
  @Roles(ROLES.EMPRESA)
  @Post('messages')
  @HttpCode(HttpStatus.OK)
  answer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssistantMessageDto,
  ): Promise<AssistantAnswer> {
    return this.answerAssistant.execute({
      companyEventId: enrollmentOf(user),
      companyUserId: membershipOf(user),
      mensaje: dto.mensaje,
      contexto: dto.contexto ?? null,
    });
  }
}
