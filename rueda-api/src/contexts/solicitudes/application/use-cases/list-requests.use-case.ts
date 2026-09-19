import { Inject, Injectable } from '@nestjs/common';
import { meetingWindow } from '../../../eventos/domain/services/event-schedule.js';
import {
  MEETING_REQUESTS_REPOSITORY,
  type MeetingRequestView,
  type MeetingRequestsRepositoryPort,
} from '../../domain/ports/meeting-requests.repository.port.js';

/**
 * Every request a company is part of, sent and received alike, bounded by the
 * meeting window of the event so past editions stay out of the way.
 */
@Injectable()
export class ListMeetingRequestsUseCase {
  constructor(
    @Inject(MEETING_REQUESTS_REPOSITORY)
    private readonly requests: MeetingRequestsRepositoryPort,
  ) {}

  async execute(companyEventId: number): Promise<MeetingRequestView[]> {
    const event = await this.requests.findPrincipalEvent();
    if (!event) return [];

    return this.requests.listFor(companyEventId, meetingWindow(event));
  }
}
