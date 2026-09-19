import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { RequestReportPort } from '../../../reportes/application/ports/request-report.port.js';

/**
 * Requests still waiting for an answer. It lives here because this context owns
 * what an operational request is: both enrollments active and inside the event.
 */
@Injectable()
export class ReportsRequestAdapter implements RequestReportPort {
  constructor(private readonly prisma: PrismaService) {}

  countPendingReceived(eventId: number, companyEventId: number): Promise<number> {
    return this.prisma.solicitudreunion.count({
      where: {
        ...this.operational(eventId),
        empresaEventorReceptora_id: companyEventId,
        estadoSolicitud: 'PENDIENTE',
      },
    });
  }

  countPendingSent(eventId: number, companyEventId: number): Promise<number> {
    return this.prisma.solicitudreunion.count({
      where: {
        ...this.operational(eventId),
        empresaEvento_id: companyEventId,
        estadoSolicitud: 'PENDIENTE',
      },
    });
  }

  private operational(eventId: number) {
    return {
      estaActivo: 1,
      empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
        evento_id: eventId,
        estaActivo: 1,
        empresa: { estaActivo: 1 },
      },
      empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
        evento_id: eventId,
        estaActivo: 1,
        empresa: { estaActivo: 1 },
      },
    };
  }
}
