import type {
  CompanyNextMeeting,
  MeetingRow,
  ResultRow,
} from '../../domain/models/report-views.js';
import type { ImpactMeeting, ImpactResult } from '../../domain/services/event-impact.js';

/**
 * Everything the reports say about meetings. Implemented by the meetings
 * context, which owns which of them are operational: inside the event window
 * and with both enrollments still active.
 */
export interface MeetingReportPort {
  countByState(eventId: number, estado: string): Promise<number>;
  /** Every operational meeting, whatever its state. */
  countAll(eventId: number): Promise<number>;
  countVirtual(eventId: number): Promise<number>;
  countUpcoming(eventId: number, now: Date): Promise<number>;

  listUpcoming(eventId: number, now: Date, limit: number): Promise<MeetingRow[]>;
  listForExport(eventId: number): Promise<MeetingRow[]>;
  listResultsForExport(eventId: number): Promise<ResultRow[]>;
  search(eventId: number, term: string): Promise<MeetingRow[]>;

  listForImpact(eventId: number): Promise<ImpactMeeting[]>;
  listResultsForImpact(eventId: number): Promise<ImpactResult[]>;

  /** Meetings the company has, minus the cancelled ones. */
  countOfCompany(eventId: number, companyEventId: number): Promise<number>;
  /** Finished meetings this company has not reported an outcome for yet. */
  countAwaitingOutcome(eventId: number, companyEventId: number): Promise<number>;
  findNextOfCompany(
    eventId: number,
    companyEventId: number,
    now: Date,
  ): Promise<CompanyNextMeeting | null>;
}

export const MEETING_REPORT_PORT = Symbol('MeetingReportPort');
