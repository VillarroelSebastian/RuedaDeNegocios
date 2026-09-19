import { Module } from '@nestjs/common';
import { CredencialesModule } from '../credenciales/credenciales.module.js';
import { PARTICIPANT_NOTIFIER } from './application/ports/participant-notifier.port.js';
import { AddParticipantUseCase } from './application/use-cases/add-participant.use-case.js';
import { GetRosterUseCase } from './application/use-cases/get-roster.use-case.js';
import { IssueTemporaryPasswordUseCase } from './application/use-cases/issue-temporary-password.use-case.js';
import { RemoveParticipantUseCase } from './application/use-cases/remove-participant.use-case.js';
import { PARTICIPANTS_REPOSITORY } from './domain/ports/participants.repository.port.js';
import { EmailParticipantNotifierAdapter } from './infrastructure/adapters/email-participant-notifier.adapter.js';
import { ParticipantsController } from './infrastructure/http/participants.controller.js';
import { PrismaParticipantsRepository } from './infrastructure/persistence/prisma-participants.repository.js';

@Module({
  // Badges belong to the credentials context; adding a participant only
  // triggers one.
  imports: [CredencialesModule],
  controllers: [ParticipantsController],
  providers: [
    GetRosterUseCase,
    AddParticipantUseCase,
    RemoveParticipantUseCase,
    IssueTemporaryPasswordUseCase,
    { provide: PARTICIPANTS_REPOSITORY, useClass: PrismaParticipantsRepository },
    { provide: PARTICIPANT_NOTIFIER, useClass: EmailParticipantNotifierAdapter },
  ],
})
export class ParticipantesModule {}
