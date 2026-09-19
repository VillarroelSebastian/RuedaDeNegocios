import { Inject, Injectable } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import type { TableAllocationPort } from '../../../solicitudes/application/ports/table-allocation.port.js';
import {
  TABLES_REPOSITORY,
  type TablesRepositoryPort,
} from '../../domain/ports/tables.repository.port.js';
import { windowWithCleanup } from '../../domain/services/table-availability.js';
import { pickBalancedTable } from '../../domain/services/table-balancing.js';

/**
 * Places meetings on tables for the requests context. It lives here because
 * this context owns what a table is busy with, including the cleanup time the
 * room needs between two meetings.
 */
@Injectable()
export class PrismaTableAllocationAdapter implements TableAllocationPort {
  constructor(@Inject(TABLES_REPOSITORY) private readonly tables: TablesRepositoryPort) {}

  async pickTable(
    eventId: number,
    window: TimeWindow,
    exceptRequestId: number | null,
  ): Promise<number | null> {
    const [bookable, busy, usage] = await Promise.all([
      this.tables.listBookableTables(eventId),
      this.busyIn(eventId, window, exceptRequestId),
      this.tables.listTableUsage(eventId),
    ]);

    const free = bookable.filter((table) => !busy.has(table.id));
    return pickBalancedTable(free, usage);
  }

  async isTableFree(
    eventId: number,
    tableId: number,
    window: TimeWindow,
    exceptRequestId: number | null,
  ): Promise<boolean> {
    const table = await this.tables.findTable(tableId, eventId);
    if (!table || !table.estaHabilitada) return false;

    const busy = await this.busyIn(eventId, window, exceptRequestId);
    return !busy.has(tableId);
  }

  /** The window a booking really consumes, cleanup time included. */
  private async busyIn(
    eventId: number,
    window: TimeWindow,
    exceptRequestId: number | null,
  ): Promise<Set<number>> {
    const event = await this.tables.findPrincipalEvent();
    const withCleanup = windowWithCleanup(window, event?.tiempoEntreReuniones ?? 0);

    return new Set(await this.tables.listBusyTableIds(eventId, withCleanup, exceptRequestId));
  }
}
