import type { AttendanceEvent } from '../services/attendance-window.js';

export interface RunningEvent extends AttendanceEvent {
  id: number;
}

export interface ScannedParticipant {
  companyUserId: number;
  nombre: string;
  empresa: string;
  cargo: string | null;
}

export interface AttendanceOutcome {
  fechaHoraAsistencia: Date;
  usesToday: number;
  /** True when the same scan arrived twice within the grace window. */
  duplicate: boolean;
}

export interface AttendanceListFilters {
  /** When set, lists a company's attendance; otherwise the caller's own scans. */
  companyEventId?: number;
  staffUserId: number;
}

export interface AttendanceRepositoryPort {
  findRunningEvent(): Promise<RunningEvent | null>;
  isStaffEnabled(userId: number): Promise<boolean>;
  findGrantedParticipant(
    companyUserId: number,
    eventId: number,
  ): Promise<ScannedParticipant | null>;

  /**
   * Records one use of a badge. Serialises concurrent scans of the same badge
   * and enforces the daily limit inside the transaction.
   */
  recordAttendance(input: {
    eventId: number;
    companyUserId: number;
    staffUserId: number;
    attendanceDate: Date;
    dailyLimit: number;
  }): Promise<AttendanceOutcome>;

  countUsesOn(eventId: number, companyUserId: number, attendanceDate: Date): Promise<number>;
  findLastUseOn(
    eventId: number,
    companyUserId: number,
    attendanceDate: Date,
  ): Promise<{ id: number; fechaHoraAsistencia: Date } | null>;

  list(eventId: number, filters: AttendanceListFilters): Promise<unknown[]>;
}

export const ATTENDANCE_REPOSITORY = Symbol('AttendanceRepositoryPort');
