import type { AssistantMeeting } from '../../domain/models/assistant-view.js';

/**
 * The meetings the assistant reads out. Implemented by the meetings context,
 * which owns which of them are live and which belong to the running event.
 */
export interface MeetingAgendaPort {
  /** Meetings that exist because a request was accepted, in time order. */
  listAccepted(companyEventId: number): Promise<AssistantMeeting[]>;

  findNext(companyEventId: number, now: Date): Promise<AssistantMeeting | null>;

  /** The next meeting that already has a table, which is not always the next one. */
  findNextWithTable(companyEventId: number, now: Date): Promise<AssistantMeeting | null>;
}

export const MEETING_AGENDA_PORT = Symbol('MeetingAgendaPort');
