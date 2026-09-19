import { Inject, Injectable } from '@nestjs/common';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepositoryPort,
} from '../../domain/ports/attendance.repository.port.js';

export interface ListAttendanceQuery {
  staffUserId: number;
  /** When given, lists that company's scans instead of the caller's own. */
  companyEventId?: number;
}

@Injectable()
export class ListAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendance: AttendanceRepositoryPort,
  ) {}

  async execute(query: ListAttendanceQuery): Promise<unknown[]> {
    const event = await this.attendance.findRunningEvent();
    if (!event) return [];

    return this.attendance.list(event.id, {
      staffUserId: query.staffUserId,
      companyEventId: query.companyEventId,
    });
  }
}
