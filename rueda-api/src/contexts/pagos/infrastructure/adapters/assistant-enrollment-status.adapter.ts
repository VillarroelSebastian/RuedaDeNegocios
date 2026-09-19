import { Injectable } from '@nestjs/common';
import type { EnrollmentStatusPort } from '../../../asistente/application/ports/enrollment-status.port.js';
import type { AssistantEnrollmentStatus } from '../../../asistente/domain/models/assistant-view.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';

/**
 * Answers the assistant about the registration: what was paid and how many
 * seats are left. It lives here because this context owns the payment state.
 */
@Injectable()
export class AssistantEnrollmentStatusAdapter implements EnrollmentStatusPort {
  constructor(private readonly prisma: PrismaService) {}

  async findStatus(companyEventId: number): Promise<AssistantEnrollmentStatus | null> {
    const enrollment = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      include: { paquete: { select: { nombre: true } } },
    });
    if (!enrollment) return null;

    const used = await this.prisma.empresa_usuario.count({
      where: { empresaevento_id: companyEventId, estaActivo: 1 },
    });

    return {
      paqueteNombre: enrollment.paquete?.nombre ?? null,
      estadoVerificacionPago: enrollment.estadoVerificacionPago,
      montoPagado: enrollment.montoPagado == null ? null : Number(enrollment.montoPagado),
      participantesUsados: used,
      participantesTotales: enrollment.numeroParticipantes ?? 0,
    };
  }
}
