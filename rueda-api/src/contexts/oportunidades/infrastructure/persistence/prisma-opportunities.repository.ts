import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { OpportunitiesRepositoryPort } from '../../domain/ports/opportunities.repository.port.js';
import type { MatchableCompany } from '../../domain/services/opportunity-matching.js';

const GRANTED = {
  estaActivo: 1,
  estadoVerificacionPago: 'COMPLETADO',
  estadoHabilitacionAcceso: 'HABILITADO',
} as const;

const WITH_COMPANY = {
  empresa: { include: { ciudad: { include: { pais: true } } } },
} as const;

function toMatchable(row: Record<string, any>): MatchableCompany {
  return {
    empresaeventoId: row.id,
    empresaId: row.empresa_id,
    codigo: row.empresa.codigo,
    nombre: row.empresa.nombre,
    rubro: row.empresa.rubro,
    oferta: row.empresa.oferta,
    demanda: row.empresa.demanda,
    interesesBusqueda: row.empresa.interesesBusqueda,
    urlFotoPerfil: row.empresa.urlFotoPerfil,
    ciudad: row.empresa.ciudad?.nombre ?? null,
    pais: row.empresa.ciudad?.pais?.nombre ?? null,
  };
}

@Injectable()
export class PrismaOpportunitiesRepository implements OpportunitiesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private async principalEventId(): Promise<number | null> {
    const evento = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return evento?.id ?? null;
  }

  async findCompany(companyEventId: number): Promise<MatchableCompany | null> {
    const row = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      include: WITH_COMPANY,
    });

    return row ? toMatchable(row) : null;
  }

  async listGranted(): Promise<MatchableCompany[]> {
    const eventoId = await this.principalEventId();
    if (!eventoId) return [];

    // The legacy company-facing list left deactivated companies in, while the
    // staff one filtered them out. A retired company is never worth meeting.
    const rows = await this.prisma.empresaevento.findMany({
      where: { evento_id: eventoId, ...GRANTED, empresa: { estaActivo: 1 } },
      include: WITH_COMPANY,
      orderBy: { empresa: { nombre: 'asc' } },
    });

    return rows.map(toMatchable);
  }
}
