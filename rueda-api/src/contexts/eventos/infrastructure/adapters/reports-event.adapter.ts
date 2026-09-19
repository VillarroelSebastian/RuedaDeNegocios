import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { EventReportPort } from '../../../reportes/application/ports/event-report.port.js';
import type { ReportEvent } from '../../../reportes/domain/models/report-views.js';
import { meetingWindow } from '../../domain/services/event-schedule.js';

/**
 * The event every report is scoped to. It lives here because the window an
 * event really runs in is this context's rule.
 */
@Injectable()
export class ReportsEventAdapter implements EventReportPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipal(): Promise<ReportEvent | null> {
    const event = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
    });
    if (!event) return null;

    const window = meetingWindow({
      startsAt: event.fechaInicioEvento,
      endsAt: event.fechaFinEvento,
      registrationStartsAt: event.fechaInicioSolicitudes,
      registrationEndsAt: event.fechaFinSolicitudes,
      meetingHoursJson: event.horariosReunionJson,
    });

    return { id: event.id, nombre: event.nombre, inicio: window.start, fin: window.end };
  }

  countActive(): Promise<number> {
    return this.prisma.evento.count({ where: { estaActivo: { not: 0 } } });
  }
}
