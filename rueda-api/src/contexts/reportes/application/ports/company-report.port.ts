import type { ImpactEnrollment } from '../../domain/services/event-impact.js';
import type {
  CompanyHit,
  RecentEnrollment,
  RosterRow,
  SectorCount,
} from '../../domain/models/report-views.js';

/**
 * Everything the reports say about the companies of an event. Implemented by
 * the companies context, which owns what an enrollment is and when it counts.
 */
export interface CompanyReportPort {
  countEnrollments(eventId: number): Promise<number>;
  countByPaymentState(eventId: number, estado: string): Promise<number>;
  /** People registered by every company of the event. */
  countParticipants(eventId: number): Promise<number>;

  listRecent(eventId: number, limit: number): Promise<RecentEnrollment[]>;
  listBySector(eventId: number, limit: number): Promise<SectorCount[]>;
  listRoster(eventId: number): Promise<RosterRow[]>;
  listForImpact(eventId: number): Promise<ImpactEnrollment[]>;
  search(eventId: number, term: string): Promise<CompanyHit[]>;
}

export const COMPANY_REPORT_PORT = Symbol('CompanyReportPort');
