import type { AssistantNews } from '../../domain/models/assistant-view.js';

/**
 * Published announcements. Implemented by the news context, which owns what
 * counts as published.
 */
export interface NewsBriefingPort {
  listPublished(eventId: number, limit: number): Promise<AssistantNews[]>;
}

export const NEWS_BRIEFING_PORT = Symbol('NewsBriefingPort');
