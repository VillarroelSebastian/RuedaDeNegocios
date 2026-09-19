import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { CompanyReportPort } from '../../../reportes/application/ports/company-report.port.js';
import type {
  CompanyHit,
  RecentEnrollment,
  RosterRow,
  SectorCount,
} from '../../../reportes/domain/models/report-views.js';
import type { ImpactEnrollment } from '../../../reportes/domain/services/event-impact.js';

const ACTIVE_ENROLLMENT = { estaActivo: 1 } as const;
/** One request can never pull the whole table into a search box. */
const SEARCH_LIMIT = 20;

/**
 * Everything the reports say about companies. It lives here because this
 * context owns what an enrollment is and when it counts.
 */
@Injectable()
export class ReportsCompanyAdapter implements CompanyReportPort {
  constructor(private readonly prisma: PrismaService) {}

  countEnrollments(eventId: number): Promise<number> {
    return this.prisma.empresaevento.count({
      where: { evento_id: eventId, ...ACTIVE_ENROLLMENT },
    });
  }

  countByPaymentState(eventId: number, estado: string): Promise<number> {
    return this.prisma.empresaevento.count({
      where: { evento_id: eventId, estadoVerificacionPago: estado, ...ACTIVE_ENROLLMENT },
    });
  }

  countParticipants(eventId: number): Promise<number> {
    return this.prisma.empresa_usuario.count({
      where: { empresaevento: { evento_id: eventId, ...ACTIVE_ENROLLMENT } },
    });
  }

  async listRecent(eventId: number, limit: number): Promise<RecentEnrollment[]> {
    const rows = await this.prisma.empresaevento.findMany({
      where: { evento_id: eventId },
      orderBy: { fechaCreacion: 'desc' },
      take: limit,
      include: { empresa: { select: { nombre: true, rubro: true } } },
    });

    return rows.map((row) => ({
      empresaEventoId: row.id,
      empresa: row.empresa.nombre,
      rubro: row.empresa.rubro,
      tipoParticipacion: row.tipoParticipacion,
      estadoPago: row.estadoVerificacionPago,
      fechaRegistro: row.fechaCreacion,
    }));
  }

  async listBySector(eventId: number, limit: number): Promise<SectorCount[]> {
    const enrolled = await this.prisma.empresaevento.findMany({
      where: { evento_id: eventId, ...ACTIVE_ENROLLMENT },
      select: { empresa_id: true },
    });

    const sectors = await this.prisma.empresa.groupBy({
      by: ['rubro'],
      where: { id: { in: enrolled.map((row) => row.empresa_id) }, estaActivo: 1 },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return sectors.map((sector) => ({ rubro: sector.rubro, empresas: sector._count.id }));
  }

  async listRoster(eventId: number): Promise<RosterRow[]> {
    const rows = await this.prisma.empresaevento.findMany({
      where: { evento_id: eventId, ...ACTIVE_ENROLLMENT },
      orderBy: { fechaCreacion: 'asc' },
      include: {
        empresa: { include: { ciudad: { include: { pais: true } } } },
        empresa_usuario: { where: { estaActivo: 1 }, select: { id: true } },
      },
    });

    return rows.map((row) => ({
      nombre: row.empresa.nombre,
      rubro: row.empresa.rubro,
      ciudad: row.empresa.ciudad?.nombre ?? null,
      pais: row.empresa.ciudad?.pais?.nombre ?? null,
      participantes: row.empresa_usuario.length,
      cuposPagados: row.numeroParticipantes,
      estadoPago: row.estadoVerificacionPago,
      acceso: row.estadoHabilitacionAcceso,
      fechaRegistro: row.fechaCreacion,
    }));
  }

  async listForImpact(eventId: number): Promise<ImpactEnrollment[]> {
    const rows = await this.prisma.empresaevento.findMany({
      where: { evento_id: eventId, ...ACTIVE_ENROLLMENT },
      select: {
        id: true,
        empresa: { select: { nombre: true, codigo: true } },
        empresa_usuario: { where: { estaActivo: 1 }, select: { id: true } },
      },
    });

    return rows.map((row) => ({
      empresaEventoId: row.id,
      nombre: row.empresa.nombre,
      codigo: row.empresa.codigo,
      participantes: row.empresa_usuario.length,
    }));
  }

  async search(eventId: number, term: string): Promise<CompanyHit[]> {
    // The legacy search read twenty enrollments and filtered them in memory, so
    // a match on the twenty-first company was simply never found.
    const rows = await this.prisma.empresaevento.findMany({
      where: {
        evento_id: eventId,
        ...ACTIVE_ENROLLMENT,
        empresa: {
          OR: [
            { nombre: { contains: term, mode: 'insensitive' } },
            { rubro: { contains: term, mode: 'insensitive' } },
            { codigo: { contains: term, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        empresa: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            rubro: true,
            urlFotoPerfil: true,
            ciudad: { select: { nombre: true } },
          },
        },
      },
      orderBy: { empresa: { nombre: 'asc' } },
      take: SEARCH_LIMIT,
    });

    return rows.map((row) => ({
      empresaEventoId: row.id,
      empresaId: row.empresa.id,
      codigo: row.empresa.codigo,
      nombre: row.empresa.nombre,
      rubro: row.empresa.rubro,
      ciudad: row.empresa.ciudad?.nombre ?? null,
      urlFotoPerfil: row.empresa.urlFotoPerfil,
      estadoPago: row.estadoVerificacionPago,
      estadoHabilitacionAcceso: row.estadoHabilitacionAcceso,
    }));
  }
}
