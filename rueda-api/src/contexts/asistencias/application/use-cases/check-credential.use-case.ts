import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import {
  CREDENTIAL_READER_PORT,
  type CredentialReaderPort,
} from '../../../credenciales/application/ports/credential-reader.port.js';
import type { CredentialView } from '../../../credenciales/domain/ports/credentials.repository.port.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepositoryPort,
} from '../../domain/ports/attendance.repository.port.js';
import { attendanceDayFor } from '../../domain/services/attendance-window.js';
import { DAILY_ATTENDANCE_LIMIT } from '../../domain/services/daily-limit.js';

export interface CheckedCredential extends CredentialView {
  asistencia: {
    /** True once the daily allowance is spent. */
    registrada: boolean;
    usosHoy: number;
    usosRestantes: number;
    limiteDiario: number;
    id?: number;
    fechaHoraAsistencia?: Date;
  };
}

/**
 * What staff sees before deciding to let someone in: the badge plus how much
 * of today's allowance is already used. Reads only, never records.
 */
@Injectable()
export class CheckCredentialUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendance: AttendanceRepositoryPort,
    @Inject(CREDENTIAL_READER_PORT) private readonly credentials: CredentialReaderPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(companyUserId: number, token: string): Promise<CheckedCredential> {
    const credential = await this.credentials.read(companyUserId, token);
    if (!credential.habilitado) {
      throw new ConflictError(
        'El participante o su empresa no están habilitados para este evento.',
      );
    }

    const event = await this.attendance.findRunningEvent();
    if (!event) throw new ConflictError('No hay un evento activo.');

    const { attendanceDate } = attendanceDayFor(event, this.clock.now());
    const [usosHoy, last] = await Promise.all([
      this.attendance.countUsesOn(event.id, companyUserId, attendanceDate),
      this.attendance.findLastUseOn(event.id, companyUserId, attendanceDate),
    ]);

    return {
      ...credential,
      asistencia: {
        registrada: usosHoy >= DAILY_ATTENDANCE_LIMIT,
        usosHoy,
        usosRestantes: Math.max(0, DAILY_ATTENDANCE_LIMIT - usosHoy),
        limiteDiario: DAILY_ATTENDANCE_LIMIT,
        ...last,
      },
    };
  }
}
