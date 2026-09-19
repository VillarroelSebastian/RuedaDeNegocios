import { Injectable } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { AttendanceReportPort } from '../../../reportes/application/ports/attendance-report.port.js';
import type { ImpactAttendance } from '../../../reportes/domain/services/event-impact.js';

/**
 * Who walked in, and when. It lives here because this context owns the check-in
 * records of participants and of sponsor staff alike.
 */
@Injectable()
export class ReportsAttendanceAdapter implements AttendanceReportPort {
  constructor(private readonly prisma: PrismaService) {}

  async listForImpact(eventId: number): Promise<ImpactAttendance[]> {
    const rows = await this.prisma.asistenciaevento.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: { fechaHoraAsistencia: 'asc' },
      select: {
        fechaHoraAsistencia: true,
        empresa_usuario_id: true,
        empresa_usuario: { select: { empresaevento_id: true } },
      },
    });

    return rows.map((row) => ({
      companyEventId: row.empresa_usuario?.empresaevento_id ?? null,
      membershipId: row.empresa_usuario_id,
      fechaHoraAsistencia: row.fechaHoraAsistencia,
    }));
  }

  async countPeopleIn(eventId: number, day: TimeWindow): Promise<number> {
    const when = { gte: day.start, lt: day.end };

    // A person who scanned in twice is still one person, and a sponsor counts
    // as much as a participant.
    const [participants, sponsors] = await Promise.all([
      this.prisma.asistenciaevento.findMany({
        where: { evento_id: eventId, estaActivo: 1, fechaHoraAsistencia: when },
        select: { empresa_usuario_id: true },
        distinct: ['empresa_usuario_id'],
      }),
      this.prisma.asistenciaauspiciador.findMany({
        where: { evento_id: eventId, estaActivo: 1, fechaHoraAsistencia: when },
        select: { auspiciadorpersona_id: true },
        distinct: ['auspiciadorpersona_id'],
      }),
    ]);

    return participants.length + sponsors.length;
  }
}
