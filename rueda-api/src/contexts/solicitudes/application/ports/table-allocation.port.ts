import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';

/**
 * Placing a meeting on a table. Declared here because this context needs it,
 * and implemented by the tables context, which owns what a table is busy with.
 */
export interface TableAllocationPort {
  /** A free table for the window, spreading the load across the floor. */
  pickTable(
    eventId: number,
    window: TimeWindow,
    exceptRequestId: number | null,
  ): Promise<number | null>;

  /** Whether that exact table may still host a meeting in the window. */
  isTableFree(
    eventId: number,
    tableId: number,
    window: TimeWindow,
    exceptRequestId: number | null,
  ): Promise<boolean>;
}

export const TABLE_ALLOCATION_PORT = Symbol('TableAllocationPort');
