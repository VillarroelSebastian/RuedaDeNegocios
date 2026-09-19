import { Injectable } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { GetAgendaUseCase } from '../../../horarios/application/use-cases/read-agenda.use-cases.js';
import type { SlotAvailabilityPort } from '../../application/ports/slot-availability.port.js';

/**
 * Asks the schedule context whether two companies can still meet in a window.
 * The agenda is the single answer to that question, so the request path reads
 * it rather than working out availability a second time and disagreeing.
 */
@Injectable()
export class AgendaSlotAvailabilityAdapter implements SlotAvailabilityPort {
  constructor(private readonly agenda: GetAgendaUseCase) {}

  async isSlotAvailable(input: {
    solicitanteId: number;
    receptoraId: number;
    window: TimeWindow;
    exceptRequestId: number | null;
  }): Promise<boolean> {
    const view = await this.agenda.execute({
      companyEventId: input.solicitanteId,
      receptoraId: input.receptoraId,
      solicitudId: input.exceptRequestId ?? undefined,
    });

    // The slot has to match exactly: the agenda offers whole slots, and half of
    // one is not something the other company ever saw.
    return view.agenda.some(
      (slot) =>
        slot.disponible &&
        new Date(slot.inicio).getTime() === input.window.start.getTime() &&
        new Date(slot.fin).getTime() === input.window.end.getTime(),
    );
  }
}
