import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  BadgeTarget,
  CredentialView,
  CredentialsRepositoryPort,
  PrintableCredential,
  PrintableEvent,
} from '../../domain/ports/credentials.repository.port.js';

const GRANTED = {
  estaActivo: 1,
  estadoHabilitacionAcceso: 'HABILITADO',
  estadoVerificacionPago: 'COMPLETADO',
} as const;

@Injectable()
export class PrismaCredentialsRepository implements CredentialsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private async principalEventId(): Promise<number | null> {
    const evento = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return evento?.id ?? null;
  }

  async findCredentialView(companyUserId: number): Promise<CredentialView | null> {
    const row = await this.prisma.empresa_usuario.findUnique({
      where: { id: companyUserId },
      include: {
        usuario: {
          select: {
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            urlFotoPerfil: true,
          },
        },
        empresa: { include: { ciudad: { include: { pais: true } } } },
        empresaevento: {
          include: {
            evento: {
              select: {
                nombre: true,
                edicion: true,
                fechaInicioEvento: true,
                fechaFinEvento: true,
                urlLogoEvento: true,
                ciudadEvento: true,
                paisEvento: true,
              },
            },
          },
        },
      },
    });
    if (!row) return null;

    const enrollment = row.empresaevento;
    return {
      valida: true,
      habilitado:
        enrollment?.estadoHabilitacionAcceso === 'HABILITADO' &&
        enrollment?.estadoVerificacionPago === 'COMPLETADO',
      participante: {
        nombre: fullNameOf(row),
        urlFotoPerfil: row.usuario.urlFotoPerfil || null,
        cargo: row.cargo || null,
        esResponsable: row.esResponsable === 1,
      },
      empresa: {
        empresaEventoId: row.empresaevento_id,
        nombre: row.empresa.nombre,
        codigo: row.empresa.codigo || null,
        rubro: row.empresa.rubro || null,
        urlFotoPerfil: row.empresa.urlFotoPerfil || null,
        ciudad: row.empresa.ciudad?.nombre ?? null,
        pais: row.empresa.ciudad?.pais?.nombre ?? null,
      },
      evento: {
        nombre: enrollment?.evento?.nombre ?? null,
        edicion: enrollment?.evento?.edicion ?? null,
        fechaInicio: enrollment?.evento?.fechaInicioEvento ?? null,
        fechaFin: enrollment?.evento?.fechaFinEvento ?? null,
        urlLogoEvento: enrollment?.evento?.urlLogoEvento ?? null,
        ciudad: enrollment?.evento?.ciudadEvento ?? null,
        pais: enrollment?.evento?.paisEvento ?? null,
      },
      tipoParticipacion: enrollment?.tipoParticipacion ?? null,
    };
  }

  async listGrantedTargets(): Promise<BadgeTarget[]> {
    const eventoId = await this.principalEventId();
    if (!eventoId) return [];

    const rows = await this.prisma.empresa_usuario.findMany({
      where: { estaActivo: 1, empresaevento: { evento_id: eventoId, ...GRANTED } },
      include: { usuario: { select: { nombres: true, apellidoPaterno: true } } },
    });
    return rows.map(toBadgeTarget);
  }

  async listPrintableTargets(companyUserId?: number): Promise<BadgeTarget[]> {
    const eventoId = await this.principalEventId();
    if (!eventoId) return [];

    // Printing only needs access to be enabled; payment is checked elsewhere.
    const rows = await this.prisma.empresa_usuario.findMany({
      where: {
        ...(companyUserId ? { id: companyUserId } : {}),
        estaActivo: 1,
        empresaevento: { evento_id: eventoId, estaActivo: 1, estadoHabilitacionAcceso: 'HABILITADO' },
      },
      orderBy: [{ empresa: { nombre: 'asc' } }, { usuario: { apellidoPaterno: 'asc' } }],
      include: { usuario: { select: { nombres: true, apellidoPaterno: true } } },
    });
    return rows.map(toBadgeTarget);
  }

  async listPrintable(companyUserIds: number[]): Promise<PrintableCredential[]> {
    if (companyUserIds.length === 0) return [];

    const rows = await this.prisma.empresa_usuario.findMany({
      where: { id: { in: companyUserIds } },
      include: { usuario: true, empresa: true },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      nombre: fullNameOf(row),
      empresa: row.empresa.nombre,
      cargo: row.cargo,
      foto: row.usuario.urlFotoPerfil || null,
      qr: row.urlCredencialQR,
    }));
  }

  async findPrintableEvent(): Promise<PrintableEvent | null> {
    const eventoId = await this.principalEventId();
    if (!eventoId) return null;

    return this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { nombre: true, edicion: true, urlLogoEvento: true },
    });
  }
}

/** Per-event overrides win, exactly as they do everywhere else. */
function fullNameOf(row: Record<string, any>): string {
  const nombres = row.nombresEvento || row.usuario.nombres;
  const paterno = row.apellidoPaternoEvento || row.usuario.apellidoPaterno;
  const materno = row.apellidoMaternoEvento ?? row.usuario.apellidoMaterno;
  return `${nombres} ${paterno}${materno ? ` ${materno}` : ''}`.trim();
}

function toBadgeTarget(row: Record<string, any>): BadgeTarget {
  return {
    companyUserId: row.id,
    fullName: `${row.usuario.nombres} ${row.usuario.apellidoPaterno}`,
    hasBadge: Boolean(row.urlCredencialQR),
  };
}
