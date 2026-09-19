import { Inject, Injectable } from '@nestjs/common';
import { boliviaDateTime } from '../../../../shared/domain/bolivia-time.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { meetingWindow } from '../../../eventos/domain/services/event-schedule.js';
import {
  TABLES_REPOSITORY,
  type TableBookings,
  type TableEventConfig,
  type TableMeeting,
  type TableSummary,
  type TablesRepositoryPort,
} from '../../domain/ports/tables.repository.port.js';
import {
  dedupeTablesByNumber,
  parseBookingWindow,
  windowWithCleanup,
} from '../../domain/services/table-availability.js';
import { computeTableState, type TableState } from '../../domain/services/table-state.js';

const DATE_KEY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const IN_PROGRESS = 'EN_CURSO';
const BOOKED = ['PROGRAMADA', 'REPROGRAMADA'];

export interface TableView extends TableBookings {
  estadoMesa: TableState;
  /** What the staff has to look at first: what is on the table right now. */
  reunionActual: TableMeeting | null;
}

export interface TablesView {
  mesas: TableView[];
  eventoConfig: TableEventConfig | null;
}

export interface TableOccupancy {
  ocupado: { inicio: string; fin: string }[];
}

function toView(table: TableBookings): TableView {
  const current =
    table.reuniones.find((meeting) => meeting.estadoReunion === IN_PROGRESS) ??
    table.reuniones.find((meeting) => BOOKED.includes(meeting.estadoReunion)) ??
    null;

  return {
    ...table,
    estadoMesa: computeTableState(table.reuniones, table.solicitudesEnEspera.length),
    reunionActual: current,
  };
}

/**
 * The floor of the event: every table with what it holds. Replaces
 * `GET /admin/mesas/agenda`, `GET /admin/mesas` and `GET /tecnico/mesas`, which
 * returned the same tables with different amounts of detail.
 *
 * The legacy `GET /admin/mesas` also created, enabled and disabled tables on
 * its way through. Provisioning now happens when the event capacity changes,
 * which is the only moment it can actually be decided, and reading the floor no
 * longer writes to it.
 */
@Injectable()
export class ListTablesUseCase {
  constructor(@Inject(TABLES_REPOSITORY) private readonly tables: TablesRepositoryPort) {}

  async execute(): Promise<TablesView> {
    const event = await this.tables.findPrincipalEvent();
    if (!event) return { mesas: [], eventoConfig: null };

    const bookings = await this.tables.listBookings(event.id, meetingWindow(event));

    return { mesas: bookings.map(toView), eventoConfig: event };
  }
}

@Injectable()
export class GetTableUseCase {
  constructor(@Inject(TABLES_REPOSITORY) private readonly tables: TablesRepositoryPort) {}

  async execute(tableId: number): Promise<TableView> {
    const event = await this.tables.findPrincipalEvent();
    const bookings = event
      ? await this.tables.findBookings(tableId, event.id, meetingWindow(event))
      : null;
    if (!bookings) throw new NotFoundError('Mesa no encontrada');

    return toView(bookings);
  }
}

/**
 * The tables that can host a meeting in a given window. A table is free only
 * when nothing else — a meeting or a request that already named it — overlaps
 * the window once the cleanup time is added on both sides.
 */
@Injectable()
export class ListAvailableTablesUseCase {
  constructor(@Inject(TABLES_REPOSITORY) private readonly tables: TablesRepositoryPort) {}

  async execute(inicio: unknown, fin: unknown): Promise<TableSummary[]> {
    const requested = parseBookingWindow(inicio, fin);

    const event = await this.tables.findPrincipalEvent();
    if (!event) return [];

    const bookable = dedupeTablesByNumber(await this.tables.listBookableTables(event.id));
    const busy = new Set(
      await this.tables.listBusyTableIds(
        event.id,
        windowWithCleanup(requested, event.tiempoEntreReuniones),
      ),
    );

    return bookable.filter((table) => !busy.has(table.id));
  }
}

/**
 * When one table is taken on one day. It is the only real constraint the staff
 * has to respect when booking by hand: any hour is fine unless it lands on one
 * of these stretches.
 */
@Injectable()
export class GetTableOccupancyUseCase {
  constructor(@Inject(TABLES_REPOSITORY) private readonly tables: TablesRepositoryPort) {}

  async execute(tableId: number, fecha: unknown): Promise<TableOccupancy> {
    if (typeof fecha !== 'string' || !DATE_KEY_SHAPE.test(fecha)) {
      throw new ValidationError('fecha requerida (YYYY-MM-DD)');
    }

    const event = await this.tables.findPrincipalEvent();
    if (!event) return { ocupado: [] };

    const day = { start: boliviaDateTime(fecha, 0, 0), end: boliviaDateTime(fecha, 24, 0) };
    const busy = await this.tables.listBusyWindows(tableId, event.id, day);

    return {
      ocupado: busy
        .map((window) => windowWithCleanup(window, event.tiempoEntreReuniones))
        .map((window) => ({
          inicio: window.start.toISOString(),
          fin: window.end.toISOString(),
        })),
    };
  }
}
