import { Inject, Injectable } from '@nestjs/common';
import type { MeetingAgendaPort } from '../../../asistente/application/ports/meeting-agenda.port.js';
import type { AssistantMeeting } from '../../../asistente/domain/models/assistant-view.js';
import { meetingWindow } from '../../../eventos/domain/services/event-schedule.js';
import {
  MEETINGS_REPOSITORY,
  type MeetingsRepositoryPort,
  type OwnMeetingView,
} from '../../domain/ports/meetings.repository.port.js';

/** A meeting the company is expected to show up to. */
const LIVE_STATES = new Set(['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO']);

function toAssistantMeeting(meeting: OwnMeetingView): AssistantMeeting {
  return {
    inicio: meeting.inicio,
    fin: meeting.fin,
    estadoReunion: meeting.estado,
    tipoReunion: meeting.tipo,
    contraparte: meeting.contraparte?.nombre ?? null,
    numeroMesa: meeting.mesa?.numeroMesa ?? null,
  };
}

/**
 * Answers the assistant about the company's meetings. It lives here because
 * this context owns which meetings are live and which belong to the event.
 */
@Injectable()
export class AssistantMeetingAgendaAdapter implements MeetingAgendaPort {
  constructor(@Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort) {}

  async listAccepted(companyEventId: number): Promise<AssistantMeeting[]> {
    return (await this.live(companyEventId)).map(toAssistantMeeting);
  }

  async findNext(companyEventId: number, now: Date): Promise<AssistantMeeting | null> {
    const next = (await this.live(companyEventId)).find((meeting) => meeting.inicio >= now);

    return next ? toAssistantMeeting(next) : null;
  }

  async findNextWithTable(companyEventId: number, now: Date): Promise<AssistantMeeting | null> {
    // The next meeting is not always the next one that has a table.
    const next = (await this.live(companyEventId)).find(
      (meeting) => meeting.mesa != null && meeting.fin >= now,
    );

    return next ? toAssistantMeeting(next) : null;
  }

  private async live(companyEventId: number): Promise<OwnMeetingView[]> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return [];

    const own = await this.meetings.listOf(companyEventId, meetingWindow(event));

    return own
      .filter((meeting) => LIVE_STATES.has(meeting.estado))
      .sort((left, right) => left.inicio.getTime() - right.inicio.getTime());
  }
}
