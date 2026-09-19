import type { EventBriefing } from '../../domain/models/assistant-view.js';

/**
 * What the assistant tells a company about the event itself. Declared here
 * because this context needs it, and implemented by the events context, which
 * owns the event and the window its meetings run in.
 */
export interface EventBriefingPort {
  findBriefing(eventId: number): Promise<EventBriefing | null>;
}

export const EVENT_BRIEFING_PORT = Symbol('EventBriefingPort');
