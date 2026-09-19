import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import type { EventScheduleSource } from '../../../eventos/domain/services/event-schedule.js';

/** The event the tables belong to, with what bounds and paces its meetings. */
export interface TableEventConfig extends EventScheduleSource {
  id: number;
  duracionReunion: number;
  /** Minutes the room needs between two meetings on the same table. */
  tiempoEntreReuniones: number;
  cantidadTotalMesasEvento: number;
  capacidadPersonasPorMesa: number;
}

export interface CompanyBrief {
  id: number;
  nombre: string;
  rubro: string | null;
  urlFotoPerfil: string | null;
}

export interface TableMeeting {
  id: number;
  estadoReunion: string;
  tipoReunion: string;
  inicio: Date;
  fin: Date;
  solicitante: CompanyBrief | null;
  receptora: CompanyBrief | null;
}

/** A request that named this table but has not been accepted yet. */
export interface PendingRequestOnTable {
  solicitudId: number;
  inicio: Date;
  fin: Date;
  solicitante: string;
  receptora: string;
}

export interface TableBlock {
  id: number;
  inicio: Date;
  fin: Date | null;
  estaOcupado: boolean;
}

export interface TableBookings {
  id: number;
  numeroMesa: number;
  capacidadPersonas: number;
  estaHabilitada: boolean;
  reuniones: TableMeeting[];
  solicitudesEnEspera: PendingRequestOnTable[];
  bloqueos: TableBlock[];
}

/** A table as it is offered for booking: the number and the seats. */
export interface TableSummary {
  id: number;
  numeroMesa: number;
  capacidadPersonas: number;
  estaHabilitada: boolean;
}

export interface TablePatch {
  capacidadPersonas?: number;
  estaHabilitada?: boolean;
}

export interface TablesRepositoryPort {
  findPrincipalEvent(): Promise<TableEventConfig | null>;

  /** Every table of the event with what it holds inside the meeting window. */
  listBookings(eventId: number, window: TimeWindow): Promise<TableBookings[]>;
  findBookings(
    tableId: number,
    eventId: number,
    window: TimeWindow,
  ): Promise<TableBookings | null>;

  /** Tables that may be offered at all: active and enabled. */
  listBookableTables(eventId: number): Promise<TableSummary[]>;
  /**
   * Tables already taken inside the window, meetings and pending requests alike.
   * A request being edited does not count as taking its own table.
   */
  listBusyTableIds(
    eventId: number,
    window: TimeWindow,
    exceptRequestId?: number | null,
  ): Promise<number[]>;
  /** How many meetings each table has hosted, so the load can be spread. */
  listTableUsage(eventId: number): Promise<Map<number, number>>;
  /** The stretches one table is taken on a given day, before any cleanup time. */
  listBusyWindows(tableId: number, eventId: number, day: TimeWindow): Promise<TimeWindow[]>;

  findTable(tableId: number, eventId: number): Promise<TableSummary | null>;
  /**
   * Raises the capacity the event declares and provisions the tables to match.
   * The count of tables is the event's own capacity: there is nowhere else to
   * keep it, and a table created outside it is deactivated on the next sync.
   */
  setTableTotal(eventId: number, total: number, capacityPerTable: number): Promise<void>;
  updateTable(tableId: number, patch: TablePatch): Promise<TableSummary>;
  deactivateTable(tableId: number): Promise<void>;
}

export const TABLES_REPOSITORY = Symbol('TablesRepositoryPort');
