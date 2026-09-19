import { Injectable } from '@nestjs/common';
import type { RequestStatusPort } from '../../../asistente/application/ports/request-status.port.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';

/**
 * Answers the assistant how many requests are still waiting, in either
 * direction. It lives here because this context owns what pending means.
 */
@Injectable()
export class AssistantRequestStatusAdapter implements RequestStatusPort {
  constructor(private readonly prisma: PrismaService) {}

  countPending(companyEventId: number): Promise<number> {
    return this.prisma.solicitudreunion.count({
      where: {
        estaActivo: 1,
        estadoSolicitud: 'PENDIENTE',
        OR: [
          { empresaEvento_id: companyEventId },
          { empresaEventorReceptora_id: companyEventId },
        ],
      },
    });
  }
}
