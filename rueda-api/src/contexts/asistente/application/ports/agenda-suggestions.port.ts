import type { AgendaSuggestions } from '../../domain/models/assistant-view.js';

/**
 * The slots two companies could actually meet in. Implemented by the schedule
 * context, which owns the grid, the declared hours and what is already taken.
 */
export interface AgendaSuggestionsPort {
  listFreeSlots(companyEventId: number, counterpartId: number): Promise<AgendaSuggestions>;
}

export const AGENDA_SUGGESTIONS_PORT = Symbol('AgendaSuggestionsPort');
