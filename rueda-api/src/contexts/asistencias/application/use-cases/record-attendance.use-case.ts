import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { isValidCredentialToken } from '../../../credenciales/domain/services/credential-token.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepositoryPort,
} from '../../domain/ports/attendance.repository.port.js';
import { attendanceDayFor } from '../../domain/services/attendance-window.js';
import { DAILY_ATTENDANCE_LIMIT } from '../../domain/services/daily-limit.js';

export interface RecordAttendanceCommand {
  /** Staff member scanning, taken from the token. */
  staffUserId: number;
  companyUserId: number;
  token: string;
}

export interface RecordAttendanceResult {
  /** True when the reader fired twice and no extra use was consumed. */
  yaRegistrada: boolean;
  fechaHoraAsistencia: Date;
  usosHoy: number;
  usosRestantes: number;
  limiteDiario: number;
  participante: { nombre: string; empresa: string; cargo: string | null };
}

@Injectable()
export class RecordAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendance: AttendanceRepositoryPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async execute(command: RecordAttendanceCommand): Promise<RecordAttendanceResult> {
    if (!isValidCredentialToken(command.companyUserId, command.token, this.env.JWT_SECRET)) {
      throw new ValidationError('El código QR no es válido.');
    }

    const event = await this.attendance.findRunningEvent();
    if (!event) throw new ConflictError('No hay un evento activo.');

    // Refuses a scan outside the event days before anything is written.
    const { attendanceDate } = attendanceDayFor(event, this.clock.now());

    if (!(await this.attendance.isStaffEnabled(command.staffUserId))) {
      throw new ForbiddenError('La cuenta técnica no está habilitada.');
    }

    const participant = await this.attendance.findGrantedParticipant(
      command.companyUserId,
      event.id,
    );
    if (!participant) {
      throw new NotFoundError('El participante no está habilitado para este evento.');
    }

    const outcome = await this.attendance.recordAttendance({
      eventId: event.id,
      companyUserId: command.companyUserId,
      staffUserId: command.staffUserId,
      attendanceDate,
      dailyLimit: DAILY_ATTENDANCE_LIMIT,
    });

    return {
      yaRegistrada: outcome.duplicate,
      fechaHoraAsistencia: outcome.fechaHoraAsistencia,
      usosHoy: outcome.usesToday,
      usosRestantes: Math.max(0, DAILY_ATTENDANCE_LIMIT - outcome.usesToday),
      limiteDiario: DAILY_ATTENDANCE_LIMIT,
      participante: {
        nombre: participant.nombre,
        empresa: participant.empresa,
        cargo: participant.cargo,
      },
    };
  }
}
