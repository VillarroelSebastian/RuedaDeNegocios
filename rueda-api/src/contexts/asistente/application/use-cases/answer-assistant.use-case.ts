import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import type { AssistantAnswer, BookingContext } from '../../domain/models/assistant-dialog.js';
import { classifyIntent } from '../../domain/services/assistant-intent.js';
import {
  activitiesReply,
  companiesReply,
  companyNotFoundReply,
  companyProfileReply,
  datesReply,
  helpReply,
  mapReply,
  meetingsReply,
  newsReply,
  nextMeetingReply,
  paymentReply,
  requestsReply,
  seatsReply,
  tableReply,
  talksReply,
} from '../../domain/services/assistant-replies.js';
import {
  ACTIVITY_BRIEFING_PORT,
  type ActivityBriefingPort,
} from '../ports/activity-briefing.port.js';
import { COMPANY_DIRECTORY_PORT, type CompanyDirectoryPort } from '../ports/company-directory.port.js';
import {
  ENROLLMENT_STATUS_PORT,
  type EnrollmentStatusPort,
} from '../ports/enrollment-status.port.js';
import { EVENT_BRIEFING_PORT, type EventBriefingPort } from '../ports/event-briefing.port.js';
import { MEETING_AGENDA_PORT, type MeetingAgendaPort } from '../ports/meeting-agenda.port.js';
import { NEWS_BRIEFING_PORT, type NewsBriefingPort } from '../ports/news-briefing.port.js';
import { REQUEST_STATUS_PORT, type RequestStatusPort } from '../ports/request-status.port.js';
import { BookingConversation } from '../services/booking-conversation.js';

export interface AssistantTurn {
  companyEventId: number;
  companyUserId: number;
  mensaje: string;
  contexto?: BookingContext | null;
}

const MAX_ACTIVITIES = 12;
const MAX_NEWS = 10;

/**
 * The virtual assistant: rules over a closed set of questions, no model behind
 * it. Reading the event is answered here; arranging a meeting is a conversation
 * of its own, and the request it ends in is created by the requests context.
 */
@Injectable()
export class AnswerAssistantUseCase {
  constructor(
    @Inject(COMPANY_DIRECTORY_PORT) private readonly companies: CompanyDirectoryPort,
    @Inject(EVENT_BRIEFING_PORT) private readonly events: EventBriefingPort,
    @Inject(MEETING_AGENDA_PORT) private readonly meetings: MeetingAgendaPort,
    @Inject(ACTIVITY_BRIEFING_PORT) private readonly activities: ActivityBriefingPort,
    @Inject(NEWS_BRIEFING_PORT) private readonly news: NewsBriefingPort,
    @Inject(ENROLLMENT_STATUS_PORT) private readonly enrollment: EnrollmentStatusPort,
    @Inject(REQUEST_STATUS_PORT) private readonly requests: RequestStatusPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    private readonly booking: BookingConversation,
  ) {}

  async execute(turn: AssistantTurn): Promise<AssistantAnswer> {
    const eventId = await this.companies.findActiveEventOf(turn.companyEventId);
    if (!eventId) {
      return { respuesta: 'Tu empresa no tiene una inscripción activa para este evento.' };
    }

    const event = await this.events.findBriefing(eventId);
    if (!event) return { respuesta: 'No hay un evento activo en este momento.' };

    const intent = classifyIntent(turn.mensaje);

    // Naming companies comes first, so "ver empresas" is a list even mid-booking.
    if (intent.kind === 'companies') {
      return companiesReply(await this.companies.listEnabled(eventId));
    }
    if (intent.kind === 'company-search') {
      const found = await this.companies.findByTerm(eventId, intent.term);
      return found ? companyProfileReply(found) : companyNotFoundReply(intent.term);
    }

    const booking = await this.booking.advance({ ...turn, eventId });
    if (booking) return booking;

    switch (intent.kind) {
      case 'meetings':
        return meetingsReply(await this.meetings.listAccepted(turn.companyEventId));
      case 'next-meeting':
        return nextMeetingReply(
          await this.meetings.findNext(turn.companyEventId, this.clock.now()),
        );
      case 'table':
        return tableReply(
          await this.meetings.findNextWithTable(turn.companyEventId, this.clock.now()),
        );
      case 'activities':
        return activitiesReply(await this.activities.listUpcoming(eventId, MAX_ACTIVITIES));
      case 'news':
        return newsReply(await this.news.listPublished(eventId, MAX_NEWS));
      case 'map':
        return mapReply(event.urlImagenMapaRecinto);
      case 'talks':
        return talksReply(event.urlImagenCronogramaCharlas);
      case 'dates':
        return datesReply(event.nombre, { start: event.inicio, end: event.fin });
      case 'payment':
        return paymentReply(await this.enrollment.findStatus(turn.companyEventId));
      case 'requests':
        return requestsReply(await this.requests.countPending(turn.companyEventId));
      case 'seats':
        return seatsReply(await this.enrollment.findStatus(turn.companyEventId));
      default:
        return helpReply();
    }
  }
}
