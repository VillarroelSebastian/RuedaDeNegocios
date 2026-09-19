import type { AssistantActivity } from '../../domain/models/assistant-view.js';

/**
 * The programme of the event. Implemented by the activities context, which owns
 * how a calendar day and a room clock time are stored.
 */
export interface ActivityBriefingPort {
  listUpcoming(eventId: number, limit: number): Promise<AssistantActivity[]>;
}

export const ACTIVITY_BRIEFING_PORT = Symbol('ActivityBriefingPort');
