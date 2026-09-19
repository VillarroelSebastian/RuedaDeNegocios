import { Inject, Injectable } from '@nestjs/common';
import { type ImpactSummary, summarizeImpact } from '../../domain/services/event-impact.js';
import {
  ATTENDANCE_REPORT_PORT,
  type AttendanceReportPort,
} from '../ports/attendance-report.port.js';
import { COMPANY_REPORT_PORT, type CompanyReportPort } from '../ports/company-report.port.js';
import { MEETING_REPORT_PORT, type MeetingReportPort } from '../ports/meeting-report.port.js';

/**
 * Gathers what the event added up to from the contexts that own each part, and
 * hands it to the domain to be turned into figures. Every screen that shows an
 * impact number reads it through here, so they can never disagree.
 */
@Injectable()
export class EventImpactReader {
  constructor(
    @Inject(COMPANY_REPORT_PORT) private readonly companies: CompanyReportPort,
    @Inject(MEETING_REPORT_PORT) private readonly meetings: MeetingReportPort,
    @Inject(ATTENDANCE_REPORT_PORT) private readonly attendance: AttendanceReportPort,
  ) {}

  async read(eventId: number): Promise<ImpactSummary> {
    const [enrollments, meetings, results, attendances] = await Promise.all([
      this.companies.listForImpact(eventId),
      this.meetings.listForImpact(eventId),
      this.meetings.listResultsForImpact(eventId),
      this.attendance.listForImpact(eventId),
    ]);

    return summarizeImpact({ enrollments, meetings, results, attendances });
  }
}
