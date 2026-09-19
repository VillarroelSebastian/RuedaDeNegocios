import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';

/**
 * Whether two companies can still meet in exactly that window. Declared here
 * because this context needs it, and implemented by the schedule context, which
 * owns what "available" means for a pair of companies.
 */
export interface SlotAvailabilityPort {
  isSlotAvailable(input: {
    solicitanteId: number;
    receptoraId: number;
    window: TimeWindow;
    /** The request being edited does not count as taking its own slot. */
    exceptRequestId: number | null;
  }): Promise<boolean>;
}

export const SLOT_AVAILABILITY_PORT = Symbol('SlotAvailabilityPort');
