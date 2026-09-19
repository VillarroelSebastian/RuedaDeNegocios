import { Module } from '@nestjs/common';
import {
  ListConversationsUseCase,
  MarkThreadReadUseCase,
  ReadThreadUseCase,
  SendCompanyMessageUseCase,
  SendStaffMessageUseCase,
} from './application/use-cases/messages.use-cases.js';
import { MESSAGES_REPOSITORY } from './domain/ports/messages.repository.port.js';
import { MessagesController } from './infrastructure/http/messages.controller.js';
import { PrismaMessagesRepository } from './infrastructure/persistence/prisma-messages.repository.js';

@Module({
  controllers: [MessagesController],
  providers: [
    ListConversationsUseCase,
    ReadThreadUseCase,
    MarkThreadReadUseCase,
    SendCompanyMessageUseCase,
    SendStaffMessageUseCase,
    { provide: MESSAGES_REPOSITORY, useClass: PrismaMessagesRepository },
  ],
})
export class MensajeriaModule {}
