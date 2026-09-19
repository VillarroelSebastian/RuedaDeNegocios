import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  CommercialProfile,
  CommercialProfilePatch,
  CompanyBasicsPatch,
  CompanyDossier,
  CompanyListFilters,
  CompanyListItem,
  CompanyParticipant,
  CompanyRepositoryPort,
  DirectoryEntry,
  DirectoryFilters,
  OwnCompanyView,
  OwnProfilePatch,
  Paginated,
} from '../../domain/ports/company.repository.port.js';

type DirectoryRow = Omit<DirectoryEntry, 'afinidad'>;

const GRANTED = {
  estaActivo: 1,
  estadoVerificacionPago: 'COMPLETADO',
  estadoHabilitacionAcceso: 'HABILITADO',
} as const;

@Injectable()
export class PrismaCompanyRepository implements CompanyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private async principalEventId(): Promise<number | null> {
    const evento = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return evento?.id ?? null;
  }

  async list(filters: CompanyListFilters): Promise<Paginated<CompanyListItem>> {
    const eventoId = await this.principalEventId();

    // The payment status filter belongs in the query. The legacy endpoint
    // applied it after paging, which returned short pages and a wrong total.
    const enrollmentFilter = {
      ...(eventoId ? { evento_id: eventoId } : {}),
      estaActivo: 1,
      ...(filters.estadoPago ? { estadoVerificacionPago: filters.estadoPago } : {}),
    };

    const where: Record<string, unknown> = {
      estaActivo: 1,
      ...(eventoId || filters.estadoPago ? { empresaevento: { some: enrollmentFilter } } : {}),
      ...(filters.rubro ? { rubro: { contains: filters.rubro, mode: 'insensitive' } } : {}),
      ...(filters.ciudad
        ? { ciudad: { nombre: { contains: filters.ciudad, mode: 'insensitive' } } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { nombre: { contains: filters.search.trim(), mode: 'insensitive' } },
              { codigo: { contains: filters.search.trim(), mode: 'insensitive' } },
              { correoCorporativo: { contains: filters.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.empresa.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { fechaCreacion: 'desc' },
        include: {
          ciudad: true,
          empresaevento: {
            where: enrollmentFilter,
            include: {
              empresa_usuario: { where: { estaActivo: 1 }, select: { id: true } },
              paquete: {
                select: {
                  id: true,
                  nombre: true,
                  costo: true,
                  nivelMesa: true,
                  credencialesIncluidas: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.empresa.count({ where }),
    ]);

    return {
      data: rows.map((row) => toListItem(row)),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async findDossier(companyId: number): Promise<CompanyDossier | null> {
    const eventoId = await this.principalEventId();
    const row = await this.prisma.empresa.findUnique({
      where: { id: companyId },
      include: {
        ciudad: { include: { pais: true } },
        empresaevento: {
          where: { ...(eventoId ? { evento_id: eventoId } : {}), estaActivo: 1 },
          include: {
            empresa_usuario: {
              where: { estaActivo: 1 },
              include: { usuario: true },
              orderBy: [{ esResponsable: 'desc' }, { id: 'asc' }],
            },
            empresaeventocomprobantes: {
              where: { estaActivo: 1 },
              orderBy: { fechaCreacion: 'asc' },
            },
            paquete: true,
          },
        },
      },
    });
    return row ? toDossier(row) : null;
  }

  async findParticipants(companyId: number): Promise<CompanyParticipant[]> {
    const eventoId = await this.principalEventId();
    const rows = await this.prisma.empresa_usuario.findMany({
      where: {
        empresa_id: companyId,
        ...(eventoId ? { empresaevento: { evento_id: eventoId, estaActivo: 1 } } : {}),
      },
      include: { usuario: true },
      orderBy: [{ esResponsable: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toParticipant);
  }

  async updateBasics(companyId: number, patch: CompanyBasicsPatch): Promise<CompanyDossier | null> {
    await this.prisma.empresa.update({
      where: { id: companyId },
      data: { ...patch, creado_modificado_fecha: new Date() },
    });
    return this.findDossier(companyId);
  }

  async deactivateEnrollment(
    companyId: number,
  ): Promise<{ enrollments: number; participants: number }> {
    const eventoId = await this.principalEventId();
    const enrollments = await this.prisma.empresaevento.findMany({
      where: {
        empresa_id: companyId,
        ...(eventoId ? { evento_id: eventoId } : {}),
        estaActivo: 1,
      },
      select: {
        id: true,
        empresa_usuario: { where: { estaActivo: 1 }, select: { id: true, usuario_id: true } },
      },
    });
    if (enrollments.length === 0) return { enrollments: 0, participants: 0 };

    const enrollmentIds = enrollments.map((item) => item.id);
    const memberIds = enrollments.flatMap((item) => item.empresa_usuario.map((eu) => eu.id));
    const userIds = [
      ...new Set(enrollments.flatMap((item) => item.empresa_usuario.map((eu) => eu.usuario_id))),
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.empresa_usuario.updateMany({
        where: { id: { in: memberIds } },
        data: { estaActivo: 0 },
      });
      await tx.empresaevento.updateMany({
        where: { id: { in: enrollmentIds } },
        data: { estaActivo: 0 },
      });

      // An account is only disabled once it belongs to no company at all, so a
      // person taking part with two companies keeps access through the other.
      for (const userId of userIds) {
        const stillLinked = await tx.empresa_usuario.findFirst({
          where: { usuario_id: userId, estaActivo: 1 },
        });
        if (!stillLinked) {
          await tx.usuario.update({ where: { id: userId }, data: { estaActivo: 0 } });
        }
      }

      const otherEnrollment = await tx.empresaevento.findFirst({
        where: { empresa_id: companyId, estaActivo: 1 },
      });
      if (!otherEnrollment) {
        await tx.empresa.update({ where: { id: companyId }, data: { estaActivo: 0 } });
      }
    });

    return { enrollments: enrollmentIds.length, participants: memberIds.length };
  }

  async findOwnCompany(userId: number): Promise<OwnCompanyView | null> {
    const eventoId = await this.principalEventId();
    const row = await this.prisma.empresa_usuario.findFirst({
      where: {
        usuario_id: userId,
        estaActivo: 1,
        ...(eventoId ? { empresaevento: { evento_id: eventoId, estaActivo: 1 } } : {}),
      },
      include: { empresa: true, empresaevento: true, usuario: true },
    });
    return row ? toOwnCompanyView(row) : null;
  }

  async findSector(companyEventId: number): Promise<string | null> {
    const row = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      select: { empresa: { select: { rubro: true } } },
    });
    return row?.empresa?.rubro ?? null;
  }

  async listDirectory(
    excludingCompanyEventId: number,
    filters: DirectoryFilters,
  ): Promise<DirectoryRow[]> {
    const eventoId = await this.principalEventId();
    if (!eventoId) return [];

    const rows = await this.prisma.empresaevento.findMany({
      where: {
        evento_id: eventoId,
        ...GRANTED,
        id: { not: excludingCompanyEventId },
        empresa: {
          ...(filters.oferta ? { oferta: { contains: filters.oferta, mode: 'insensitive' } } : {}),
          ...(filters.demanda
            ? { demanda: { contains: filters.demanda, mode: 'insensitive' } }
            : {}),
          ...(filters.lugar
            ? {
                ciudad: {
                  OR: [
                    { nombre: { contains: filters.lugar, mode: 'insensitive' } },
                    { pais: { nombre: { contains: filters.lugar, mode: 'insensitive' } } },
                  ],
                },
              }
            : {}),
        },
      },
      include: {
        empresa: { include: { ciudad: { include: { pais: true } } } },
        paquete: {
          select: {
            nombre: true,
            nivelMesa: true,
            apareceEnCatalogo: true,
            destacadoEnListados: true,
          },
        },
      },
    });

    // The package decides catalogue visibility. Enrollments predating packages
    // carry none, and those always appear.
    return rows
      .filter((row) => (row.paquete?.apareceEnCatalogo ?? 1) === 1)
      .map(toDirectoryRow);
  }

  async findDirectoryEntry(companyEventId: number): Promise<DirectoryRow | null> {
    const row = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      include: {
        empresa: { include: { ciudad: { include: { pais: true } } } },
        paquete: {
          select: {
            nombre: true,
            nivelMesa: true,
            apareceEnCatalogo: true,
            destacadoEnListados: true,
          },
        },
      },
    });
    return row ? toDirectoryRow(row) : null;
  }

  async updateCommercialProfile(
    companyId: number,
    patch: CommercialProfilePatch,
  ): Promise<CommercialProfile> {
    return this.prisma.empresa.update({
      where: { id: companyId },
      data: { ...patch, creado_modificado_fecha: new Date() },
      select: { id: true, codigo: true, oferta: true, demanda: true, interesesBusqueda: true },
    });
  }

  async updateLogo(companyId: number, url: string) {
    return this.prisma.empresa.update({
      where: { id: companyId },
      data: { urlFotoPerfil: url, creado_modificado_fecha: new Date() },
      select: { id: true, urlFotoPerfil: true },
    });
  }

  async updateOwnProfile(
    companyUserId: number,
    patch: OwnProfilePatch,
  ): Promise<OwnCompanyView['usuario']> {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.empresa_usuario.update({
        where: { id: companyUserId },
        data: {
          nombresEvento: patch.nombres || undefined,
          apellidoPaternoEvento: patch.apellidoPaterno || undefined,
          apellidoMaternoEvento: patch.apellidoMaterno ?? null,
          telefonoEvento: patch.telefono || undefined,
        },
        include: { usuario: true },
      });

      const usuario =
        patch.urlFotoPerfil !== undefined
          ? await tx.usuario.update({
              where: { id: membership.usuario_id },
              data: { urlFotoPerfil: patch.urlFotoPerfil, creadoModificadoFecha: new Date() },
            })
          : membership.usuario;

      return withEventIdentity(membership, usuario);
    });
  }
}

/** Prisma money columns arrive as `Decimal`. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'object' && 'toNumber' in value
    ? (value as { toNumber(): number }).toNumber()
    : Number(value);
}

/**
 * Per-event overrides win over the account fields. Blank strings fall back,
 * but an explicit null on the second surname is honoured.
 */
function withEventIdentity(
  membership: Record<string, unknown>,
  usuario: Record<string, unknown>,
): OwnCompanyView['usuario'] {
  return {
    id: usuario.id as number,
    nombres: (membership.nombresEvento as string) || (usuario.nombres as string) || '',
    apellidoPaterno:
      (membership.apellidoPaternoEvento as string) || (usuario.apellidoPaterno as string) || '',
    apellidoMaterno:
      (membership.apellidoMaternoEvento as string | null) ??
      (usuario.apellidoMaterno as string | null) ??
      null,
    correo: usuario.correo as string,
    telefono: (membership.telefonoEvento as string) || (usuario.telefono as string) || '',
    rolEvento: usuario.rolEvento as string,
    urlFotoPerfil: usuario.urlFotoPerfil as string,
  };
}

function toListItem(row: Record<string, any>): CompanyListItem {
  const enrollment = row.empresaevento?.[0];
  return {
    id: row.id,
    nombre: row.nombre,
    codigo: row.codigo,
    rubro: row.rubro,
    ciudad: row.ciudad?.nombre ?? '',
    telefonoWhatsapp: row.telefonoWhatsapp,
    correoCorporativo: row.correoCorporativo,
    urlFotoPerfil: row.urlFotoPerfil,
    sitioWeb: row.sitioWeb,
    descripcion: row.descripcion,
    fechaCreacion: row.fechaCreacion,
    empresaEventoId: enrollment?.id ?? null,
    estadoVerificacionPago: enrollment?.estadoVerificacionPago ?? 'SIN_REGISTRO',
    estadoHabilitacionAcceso: enrollment?.estadoHabilitacionAcceso ?? 'SIN_REGISTRO',
    numeroParticipantes: enrollment?.numeroParticipantes ?? 0,
    participantesRegistrados: enrollment?.empresa_usuario?.length ?? 0,
    montoPagado: toNumber(enrollment?.montoPagado),
    tipoParticipacion: enrollment?.tipoParticipacion ?? null,
    paquete: enrollment?.paquete
      ? {
          id: enrollment.paquete.id,
          nombre: enrollment.paquete.nombre,
          costo: toNumber(enrollment.paquete.costo) ?? 0,
          nivelMesa: enrollment.paquete.nivelMesa,
          credencialesIncluidas: enrollment.paquete.credencialesIncluidas,
        }
      : null,
  };
}

function toParticipant(row: Record<string, any>): CompanyParticipant {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    nombres: row.nombresEvento || row.usuario?.nombres || '',
    apellidoPaterno: row.apellidoPaternoEvento || row.usuario?.apellidoPaterno || '',
    apellidoMaterno: row.apellidoMaternoEvento ?? row.usuario?.apellidoMaterno ?? null,
    correo: row.usuario?.correo ?? null,
    telefono: row.telefonoEvento || row.usuario?.telefono || null,
    cargo: row.cargo ?? null,
    esResponsable: row.esResponsable === 1,
    urlCredencialQR: row.urlCredencialQR ?? null,
    estaActivo: row.usuario?.estaActivo ?? 0,
  };
}

function toDossier(row: Record<string, any>): CompanyDossier {
  const enrollment = row.empresaevento?.[0] ?? null;
  return {
    id: row.id,
    nombre: row.nombre,
    rubro: row.rubro,
    codigo: row.codigo,
    sitioWeb: row.sitioWeb,
    descripcion: row.descripcion,
    telefonoWhatsapp: row.telefonoWhatsapp,
    correoCorporativo: row.correoCorporativo,
    urlFotoPerfil: row.urlFotoPerfil,
    urlPdf: row.urlPdf,
    oferta: row.oferta,
    demanda: row.demanda,
    interesesBusqueda: row.interesesBusqueda,
    estaActivo: row.estaActivo,
    fechaCreacion: row.fechaCreacion,
    pais: row.ciudad?.pais?.nombre ?? null,
    ciudad: row.ciudad?.nombre ?? null,
    empresaEventoId: enrollment?.id ?? null,
    paquete: enrollment?.paquete
      ? { ...enrollment.paquete, costo: toNumber(enrollment.paquete.costo) }
      : null,
    tipoParticipacion: enrollment?.tipoParticipacion ?? null,
    numeroParticipantes: enrollment?.numeroParticipantes ?? 0,
    montoPagado: toNumber(enrollment?.montoPagado),
    estadoVerificacionPago: enrollment?.estadoVerificacionPago ?? 'SIN_REGISTRO',
    estadoHabilitacionAcceso: enrollment?.estadoHabilitacionAcceso ?? 'SIN_REGISTRO',
    motivoRechazoAcceso: enrollment?.motivoRechazoAcceso ?? null,
    fechaHoraEnvioComprobante: enrollment?.fechaHoraEnvioComprobante ?? null,
    participantes: (enrollment?.empresa_usuario ?? []).map(toParticipant),
    comprobantes: (enrollment?.empresaeventocomprobantes ?? []).map((receipt: any) => ({
      id: receipt.id,
      tipoPago: receipt.tipoPago,
      estadoPago: receipt.estadoPago,
      montoPago: toNumber(receipt.montoPago),
      cantidadParticipantes: receipt.cantidadParticipantes,
      observacion: receipt.observacion,
      url: receipt.urlComprobantePagoInscripcion,
      fechaCreacion: receipt.fechaCreacion,
    })),
  };
}

function toOwnCompanyView(row: Record<string, any>): OwnCompanyView {
  return {
    empresaUsuarioId: row.id,
    empresaeventoId: row.empresaevento_id,
    cargo: row.cargo ?? null,
    esResponsable: row.esResponsable === 1,
    urlCredencialQR: row.urlCredencialQR ?? null,
    usuario: withEventIdentity(row, row.usuario),
    empresa: {
      id: row.empresa.id,
      nombre: row.empresa.nombre,
      rubro: row.empresa.rubro,
      codigo: row.empresa.codigo,
      correoCorporativo: row.empresa.correoCorporativo,
      telefonoWhatsapp: row.empresa.telefonoWhatsapp,
      sitioWeb: row.empresa.sitioWeb,
      descripcion: row.empresa.descripcion,
      urlFotoPerfil: row.empresa.urlFotoPerfil,
      oferta: row.empresa.oferta,
      demanda: row.empresa.demanda,
      interesesBusqueda: row.empresa.interesesBusqueda,
    },
    estadoPago: row.empresaevento?.estadoVerificacionPago ?? 'PENDIENTE',
    estadoAcceso: row.empresaevento?.estadoHabilitacionAcceso ?? 'PENDIENTE',
    tipoParticipacion: row.empresaevento?.tipoParticipacion ?? null,
    horariosConfigurados: Boolean(row.empresaevento?.horariosDisponibilidadJson),
    numeroParticipantes: row.empresaevento?.numeroParticipantes ?? null,
  };
}

function toDirectoryRow(row: Record<string, any>): DirectoryRow {
  return {
    empresaeventoId: row.id,
    empresaId: row.empresa_id,
    codigo: row.empresa.codigo,
    nombre: row.empresa.nombre,
    rubro: row.empresa.rubro,
    descripcion: row.empresa.descripcion,
    oferta: row.empresa.oferta,
    demanda: row.empresa.demanda,
    urlFotoPerfil: row.empresa.urlFotoPerfil,
    sitioWeb: row.empresa.sitioWeb,
    urlPdf: row.empresa.urlPdf,
    correoCorporativo: row.empresa.correoCorporativo,
    telefonoWhatsapp: row.empresa.telefonoWhatsapp,
    ciudad: row.empresa.ciudad?.nombre ?? null,
    pais: row.empresa.ciudad?.pais?.nombre ?? null,
    tipoParticipacion: row.tipoParticipacion,
    paquete: row.paquete?.nombre ?? null,
    nivelMesa: row.paquete?.nivelMesa ?? 'NORMAL',
    destacado: (row.paquete?.destacadoEnListados ?? 0) === 1,
  };
}
