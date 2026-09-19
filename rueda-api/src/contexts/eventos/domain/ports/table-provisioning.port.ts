/**
 * Keeps the event's tables in step with its configured capacity. Owned by the
 * mesas context; events only trigger it after their capacity changes.
 */
export interface TableProvisioningPort {
  /**
   * Creates the missing tables up to `total`, refreshes the capacity of the
   * ones in range, and deactivates the surplus — except tables already holding
   * a live meeting or a pending request, which are never taken away.
   */
  syncTables(eventId: number, total: number, capacityPerTable: number): Promise<void>;
}

export const TABLE_PROVISIONING_PORT = Symbol('TableProvisioningPort');
