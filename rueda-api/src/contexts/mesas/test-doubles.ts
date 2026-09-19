import type { TimeWindow } from '../../shared/domain/bolivia-time.js';
import type {
  TableBookings,
  TableEventConfig,
  TableMeeting,
  TablePatch,
  TableSummary,
  TablesRepositoryPort,
} from './domain/ports/tables.repository.port.js';

/**
 * In-memory doubles for the tables context. They implement the ports literally
 * so the use-case tests exercise real behaviour without a database.
 */

/** A three-day event in November, 10 tables of 4 seats, 10 minutes of cleanup. */
export const EVENT: TableEventConfig = {
  id: 7,
  startsAt: new Date('2026-11-10T00:00:00.000Z'),
  endsAt: new Date('2026-11-13T00:00:00.000Z'),
  registrationStartsAt: null,
  registrationEndsAt: null,
  meetingHoursJson: null,
  duracionReunion: 20,
  tiempoEntreReuniones: 10,
  cantidadTotalMesasEvento: 10,
  capacidadPersonasPorMesa: 4,
};

export function buildMeeting(overrides: Partial<TableMeeting> = {}): TableMeeting {
  return {
    id: 50,
    estadoReunion: 'PROGRAMADA',
    tipoReunion: 'PRESENCIAL',
    inicio: new Date('2026-11-10T14:00:00.000Z'),
    fin: new Date('2026-11-10T14:20:00.000Z'),
    solicitante: { id: 1, nombre: 'Agro Beni', rubro: 'Agroindustria', urlFotoPerfil: null },
    receptora: { id: 2, nombre: 'Ganadera Beni', rubro: 'Ganadería', urlFotoPerfil: null },
    ...overrides,
  };
}

export function buildTable(overrides: Partial<TableBookings> = {}): TableBookings {
  return {
    id: 1,
    numeroMesa: 1,
    capacidadPersonas: 4,
    estaHabilitada: true,
    reuniones: [],
    solicitudesEnEspera: [],
    bloqueos: [],
    ...overrides,
  };
}

export function buildSummary(overrides: Partial<TableSummary> = {}): TableSummary {
  return { id: 1, numeroMesa: 1, capacidadPersonas: 4, estaHabilitada: true, ...overrides };
}

export interface FakeTablesOptions {
  event?: TableEventConfig | null;
  bookings?: TableBookings[];
  table?: TableBookings | null;
  bookable?: TableSummary[];
  busyTableIds?: number[];
  tableUsage?: Map<number, number>;
  busyWindows?: TimeWindow[];
  summary?: TableSummary | null;
}

export class FakeTablesRepository implements TablesRepositoryPort {
  readonly totals: { eventId: number; total: number; capacityPerTable: number }[] = [];
  readonly patches: { tableId: number; patch: TablePatch }[] = [];
  readonly deactivated: number[] = [];
  readonly windows: TimeWindow[] = [];

  constructor(private readonly options: FakeTablesOptions = {}) {}

  async findPrincipalEvent(): Promise<TableEventConfig | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async listBookings(_eventId: number, window: TimeWindow): Promise<TableBookings[]> {
    this.windows.push(window);
    return this.options.bookings ?? [buildTable()];
  }

  async findBookings(
    tableId: number,
    eventId: number,
    window: TimeWindow,
  ): Promise<TableBookings | null> {
    this.windows.push(window);
    if (eventId !== EVENT.id) return null;
    if (this.options.table !== undefined) return this.options.table;
    return tableId === 1 ? buildTable() : null;
  }

  async listBookableTables(): Promise<TableSummary[]> {
    return (
      this.options.bookable ?? [buildSummary(), buildSummary({ id: 2, numeroMesa: 2 })]
    );
  }

  async listBusyTableIds(_eventId: number, window: TimeWindow): Promise<number[]> {
    this.windows.push(window);
    return this.options.busyTableIds ?? [];
  }

  async listTableUsage(): Promise<Map<number, number>> {
    return this.options.tableUsage ?? new Map();
  }

  async listBusyWindows(
    _tableId: number,
    _eventId: number,
    day: TimeWindow,
  ): Promise<TimeWindow[]> {
    this.windows.push(day);
    return this.options.busyWindows ?? [];
  }

  async findTable(tableId: number, eventId: number): Promise<TableSummary | null> {
    if (eventId !== EVENT.id) return null;
    if (this.options.summary !== undefined) return this.options.summary;
    return tableId === 1 ? buildSummary() : null;
  }

  async setTableTotal(eventId: number, total: number, capacityPerTable: number): Promise<void> {
    this.totals.push({ eventId, total, capacityPerTable });
  }

  async updateTable(tableId: number, patch: TablePatch): Promise<TableSummary> {
    this.patches.push({ tableId, patch });
    return buildSummary({ id: tableId, ...patch });
  }

  async deactivateTable(tableId: number): Promise<void> {
    this.deactivated.push(tableId);
  }
}
