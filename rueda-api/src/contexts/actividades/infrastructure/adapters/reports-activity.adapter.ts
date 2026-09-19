import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { ActivityReportPort } from '../../../reportes/application/ports/activity-report.port.js';
import type { ActivityRow } from '../../../reportes/domain/models/report-views.js';

/** The programme, as the dashboards and the statistics read it. */
@Injectable()
export class ReportsActivityAdapter implements ActivityReportPort {
  constructor(private readonly prisma: PrismaService) {}

  countOfEvent(eventId: number): Promise<number> {
    return this.prisma.actividadprograma.count({
      where: { evento_id: eventId, estaActivo: 1 },
    });
  }

  async listUpcoming(eventId: number, now: Date, limit: number): Promise<ActivityRow[]> {
    const rows = await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventId, estaActivo: 1, fechaActividad: { gte: now } },
      orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombreActividad,
      fecha: row.fechaActividad,
      hora: row.horaInicioActividad,
      tipo: row.tipoActividad,
      sala: row.nombreSalaEspacio,
    }));
  }
}
