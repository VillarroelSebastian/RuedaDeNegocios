import type { ActivityRow } from '../../domain/models/report-views.js';

/**
 * The programme of the event. Implemented by the activities context, which
 * owns which days an activity may fall on.
 */
export interface ActivityReportPort {
  countOfEvent(eventId: number): Promise<number>;
  listUpcoming(eventId: number, now: Date, limit: number): Promise<ActivityRow[]>;
}

export const ACTIVITY_REPORT_PORT = Symbol('ActivityReportPort');
