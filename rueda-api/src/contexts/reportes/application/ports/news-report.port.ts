import type { NewsRow } from '../../domain/models/report-views.js';

/** The latest announcements. Implemented by the news context. */
export interface NewsReportPort {
  listLatest(eventId: number, limit: number): Promise<NewsRow[]>;
}

export const NEWS_REPORT_PORT = Symbol('NewsReportPort');
