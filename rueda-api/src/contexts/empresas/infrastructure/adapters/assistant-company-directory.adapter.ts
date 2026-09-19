import { Injectable } from '@nestjs/common';
import type { CompanyDirectoryPort } from '../../../asistente/application/ports/company-directory.port.js';
import type { AssistantCompany } from '../../../asistente/domain/models/assistant-view.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';

const WITH_COMPANY = {
  empresa: { select: { nombre: true, codigo: true, rubro: true, oferta: true } },
} as const;

const BY_NAME = { empresa: { nombre: 'asc' } } as const;

function toCompany(row: Record<string, any>): AssistantCompany {
  return {
    empresaeventoId: row.id,
    nombre: row.empresa.nombre,
    codigo: row.empresa.codigo,
    rubro: row.empresa.rubro,
    oferta: row.empresa.oferta ?? null,
  };
}

/**
 * Answers the assistant about the companies of an event. It lives here because
 * this context owns what makes a company visible and what makes it bookable.
 */
@Injectable()
export class AssistantCompanyDirectoryAdapter implements CompanyDirectoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveEventOf(companyEventId: number): Promise<number | null> {
    const enrollment = await this.prisma.empresaevento.findFirst({
      where: { id: companyEventId, estaActivo: 1, empresa: { estaActivo: 1 } },
      select: { evento_id: true },
    });

    return enrollment?.evento_id ?? null;
  }

  async listEnabled(eventId: number): Promise<AssistantCompany[]> {
    const rows = await this.prisma.empresaevento.findMany({
      where: {
        evento_id: eventId,
        estaActivo: 1,
        estadoHabilitacionAcceso: 'HABILITADO',
        empresa: { estaActivo: 1 },
      },
      include: WITH_COMPANY,
      orderBy: BY_NAME,
    });

    return rows.map(toCompany);
  }

  async findByTerm(eventId: number, term: string): Promise<AssistantCompany | null> {
    const row = await this.prisma.empresaevento.findFirst({
      where: {
        evento_id: eventId,
        estaActivo: 1,
        estadoHabilitacionAcceso: 'HABILITADO',
        empresa: {
          estaActivo: 1,
          OR: [
            { codigo: { equals: term, mode: 'insensitive' } },
            { nombre: { contains: term, mode: 'insensitive' } },
          ],
        },
      },
      include: WITH_COMPANY,
      orderBy: BY_NAME,
    });

    return row ? toCompany(row) : null;
  }

  async listBookable(
    eventId: number,
    exceptCompanyEventId: number,
    term: string,
  ): Promise<AssistantCompany[]> {
    // A meeting may only be asked from a company that paid and was let in.
    const rows = await this.prisma.empresaevento.findMany({
      where: {
        evento_id: eventId,
        estaActivo: 1,
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
        id: { not: exceptCompanyEventId },
        empresa: {
          estaActivo: 1,
          ...(term
            ? {
                OR: [
                  { nombre: { contains: term, mode: 'insensitive' } },
                  { codigo: { equals: term, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      include: WITH_COMPANY,
      take: 100,
      orderBy: BY_NAME,
    });

    return rows.map(toCompany);
  }
}
