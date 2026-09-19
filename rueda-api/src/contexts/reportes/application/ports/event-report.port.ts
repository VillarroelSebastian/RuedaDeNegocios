import type { ReportEvent } from '../../domain/models/report-views.js';

/**
 * The event every report is scoped to. Implemented by the events context,
 * which owns the window an event really runs in.
 */
export interface EventReportPort {
  findPrincipal(): Promise<ReportEvent | null>;
  countActive(): Promise<number>;
}

export const EVENT_REPORT_PORT = Symbol('EventReportPort');
