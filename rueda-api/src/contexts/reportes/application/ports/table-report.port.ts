import type { TableRow } from '../../domain/models/report-views.js';

/** What the reports say about the floor. Implemented by the tables context. */
export interface TableReportPort {
  countActive(eventId: number): Promise<number>;
  countDisabled(eventId: number): Promise<number>;
  list(eventId: number): Promise<TableRow[]>;
  search(eventId: number, term: string): Promise<TableRow[]>;
}

export const TABLE_REPORT_PORT = Symbol('TableReportPort');
