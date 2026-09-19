import { Injectable } from '@nestjs/common';
import type { AgendaSuggestionsPort } from '../../../asistente/application/ports/agenda-suggestions.port.js';
import type { AgendaSuggestions } from '../../../asistente/domain/models/assistant-view.js';
import { GetAgendaUseCase } from '../../application/use-cases/read-agenda.use-cases.js';

/**
 * Offers the assistant the slots two companies could meet in. It reuses the
 * agenda this context already lays out, so the conversation can never offer a
 * slot the picker would refuse.
 */
@Injectable()
export class AssistantAgendaSuggestionsAdapter implements AgendaSuggestionsPort {
  constructor(private readonly agenda: GetAgendaUseCase) {}

  async listFreeSlots(companyEventId: number, counterpartId: number): Promise<AgendaSuggestions> {
    const view = await this.agenda.execute({ companyEventId, receptoraId: counterpartId });

    return {
      slots: view.horarios.map((slot) => new Date(slot.inicio)),
      duracionMinutos: view.duracionMinutos,
    };
  }
}
