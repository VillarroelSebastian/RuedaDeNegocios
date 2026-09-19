import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors/domain.error.js';
import {
  PARTICIPANTS_REPOSITORY,
  type ParticipantsRepositoryPort,
} from '../../domain/ports/participants.repository.port.js';

export interface RemoveParticipantCommand {
  companyEventId: number;
  userId: number;
  companyUserId: number;
}

@Injectable()
export class RemoveParticipantUseCase {
  constructor(
    @Inject(PARTICIPANTS_REPOSITORY) private readonly participants: ParticipantsRepositoryPort,
  ) {}

  async execute(command: RemoveParticipantCommand): Promise<void> {
    const responsible = await this.participants.findResponsibleMembership(
      command.companyEventId,
      command.userId,
    );
    if (!responsible) {
      throw new ForbiddenError('Solo el encargado puede desactivar participantes.');
    }
    if (responsible.id === command.companyUserId) {
      throw new ConflictError('No puedes desactivarte a ti mismo.');
    }

    // Only a non-responsible, still-active member of this same enrollment.
    const participant = await this.participants.findRemovableParticipant(
      command.companyEventId,
      command.companyUserId,
    );
    if (!participant) {
      throw new NotFoundError('El participante no existe o no se puede desactivar.');
    }

    await this.participants.deactivateParticipant(participant.id, participant.userId);
  }
}
