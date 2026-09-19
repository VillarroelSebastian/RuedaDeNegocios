import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  CompanyMembership,
  CompanyMembershipRepositoryPort,
  EnrollmentStatus,
} from '../../domain/ports/company-membership.repository.port.js';

/** Enrollment must clear both gates before its memberships count as granted. */
export const GRANTED_ENROLLMENT = {
  estaActivo: 1,
  estadoHabilitacionAcceso: 'HABILITADO',
  estadoVerificacionPago: 'COMPLETADO',
} as const;

@Injectable()
export class PrismaCompanyMembershipRepository implements CompanyMembershipRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEventId(): Promise<number | null> {
    const evento = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return evento?.id ?? null;
  }

  async findMembershipInEvent(
    userId: number,
    eventId: number | null,
  ): Promise<CompanyMembership | null> {
    const row = await this.prisma.empresa_usuario.findFirst({
      where: {
        usuario_id: userId,
        estaActivo: 1,
        empresaevento: { evento_id: eventId ?? undefined, estaActivo: 1 },
      },
      select: {
        id: true,
        empresaevento_id: true,
        esResponsable: true,
        nombresEvento: true,
        apellidoPaternoEvento: true,
        apellidoMaternoEvento: true,
        telefonoEvento: true,
      },
    });
    if (!row) return null;

    return {
      id: row.id,
      companyEventId: row.empresaevento_id,
      isResponsible: row.esResponsable === 1,
      nombresEvento: row.nombresEvento,
      apellidoPaternoEvento: row.apellidoPaternoEvento,
      apellidoMaternoEvento: row.apellidoMaternoEvento,
      telefonoEvento: row.telefonoEvento,
    };
  }

  async findEnrollmentStatus(companyEventId: number): Promise<EnrollmentStatus | null> {
    const row = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      select: { estadoHabilitacionAcceso: true, estadoVerificacionPago: true },
    });
    if (!row) return null;

    return {
      accessStatus: row.estadoHabilitacionAcceso,
      paymentStatus: row.estadoVerificacionPago,
    };
  }

  async findGrantedMemberships(userId: number): Promise<{ id: number; companyEventId: number }[]> {
    const rows = await this.prisma.empresa_usuario.findMany({
      where: { usuario_id: userId, estaActivo: 1, empresaevento: GRANTED_ENROLLMENT },
      select: { id: true, empresaevento_id: true },
    });
    return rows.map((row) => ({ id: row.id, companyEventId: row.empresaevento_id }));
  }
}
