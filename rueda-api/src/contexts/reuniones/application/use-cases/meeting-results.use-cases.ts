import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors/domain.error.js';
import {
  MEETINGS_REPOSITORY,
  type MeetingResultView,
  type MeetingsRepositoryPort,
} from '../../domain/ports/meetings.repository.port.js';
import { sanitizeEvaluation } from '../../domain/services/meeting-evaluation.js';

export interface RecordResultCommand {
  /** The company recording it, taken from its token. */
  companyEventId: number;
  /** The membership signing it, taken from its token. */
  companyUserId: number;
  meetingId: number;
  calificacion: unknown;
  rango: unknown;
  observaciones: unknown;
}

/**
 * What a company got out of a meeting it took part in. It is the same record
 * the event team can fill in on both companies' behalf when they leave without
 * writing it, so a company that already wrote its own is never overwritten.
 */
@Injectable()
export class RecordMeetingResultUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(command: RecordResultCommand): Promise<{ id: number }> {
    const evaluation = sanitizeEvaluation(
      command.calificacion,
      command.rango,
      command.observaciones,
    );

    const event = await this.meetings.findPrincipalEvent();
    const meeting = event ? await this.meetings.find(command.meetingId, event.id) : null;
    if (!meeting) throw new NotFoundError('Reunión no encontrada o no participas en ella');

    const parties = [meeting.solicitanteId, meeting.receptoraId];
    if (!parties.includes(command.companyEventId)) {
      throw new ForbiddenError('Reunión no encontrada o no participas en ella');
    }

    // A meeting still running has nothing to report on yet. One whose hour has
    // passed counts, even if nobody pressed "finish".
    if (
      meeting.estadoReunion !== 'FINALIZADA' &&
      meeting.fin.getTime() > this.clock.now().getTime()
    ) {
      throw new ConflictError(
        'La reunión debe estar finalizada antes de registrar el resultado',
      );
    }

    const existing = await this.meetings.findOwnResult(
      command.meetingId,
      command.companyEventId,
    );
    if (existing) throw new ConflictError('Ya registraste un resultado para esta reunión');

    const membership = await this.meetings.findMembership(
      command.companyUserId,
      command.companyEventId,
    );
    if (!membership) {
      throw new ForbiddenError(
        'Tu participante no está habilitado para registrar el resultado',
      );
    }

    return this.meetings.saveOwnResult({
      meetingId: command.meetingId,
      calificadora: command.companyEventId,
      calificada:
        meeting.solicitanteId === command.companyEventId
          ? meeting.receptoraId
          : meeting.solicitanteId,
      autor: membership.id,
      evaluation,
    });
  }
}

/** Everything the company recorded, newest first. */
@Injectable()
export class ListOwnMeetingResultsUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort,
  ) {}

  execute(companyEventId: number): Promise<MeetingResultView[]> {
    return this.meetings.listResultsOf(companyEventId);
  }
}
