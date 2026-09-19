import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import type { ImpactAttendance } from '../../domain/services/event-impact.js';

/**
 * Who walked in, and when. Implemented by the attendance context, which owns
 * the check-in records of both participants and sponsors.
 */
export interface AttendanceReportPort {
  listForImpact(eventId: number): Promise<ImpactAttendance[]>;

  /**
   * People — participants and sponsor staff alike — who checked in during the
   * day, counted once each however many times they scanned.
   */
  countPeopleIn(eventId: number, day: TimeWindow): Promise<number>;
}

export const ATTENDANCE_REPORT_PORT = Symbol('AttendanceReportPort');
