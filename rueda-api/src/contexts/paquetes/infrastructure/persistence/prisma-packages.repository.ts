import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  OwnPackageView,
  PackageRecord,
  PackageUsage,
  PackagesRepositoryPort,
} from '../../domain/ports/packages.repository.port.js';
import type { PackageDefinition } from '../../domain/services/package-definition.js';

const PACKAGE_SELECT = {
  id: true,
  nombre: true,
  objetivo: true,
  descripcion: true,
  contenido: true,
  costo: true,
  credencialesIncluidas: true,
  maxParticipantes: true,
  nivelMesa: true,
  tipoParticipacion: true,
  apareceEnCatalogo: true,
  logoEnWeb: true,
  destacadoEnListados: true,
  urlQR: true,
  orden: true,
} as const;

/** The order the administrator arranged, then the cheapest first. */
const CATALOGUE_ORDER = [{ orden: 'asc' }, { costo: 'asc' }] as const;

/** Fallbacks for an enrollment that predates packages. */
const WITHOUT_PACKAGE = { maxParticipantes: 5, credencialesIncluidas: 2 } as const;

type Row = Record<string, any>;

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'object' && 'toNumber' in value
    ? (value as { toNumber(): number }).toNumber()
    : Number(value);
}

function toPackage(row: Row): PackageRecord {
  return {
    id: row.id,
    nombre: row.nombre,
    objetivo: row.objetivo,
    descripcion: row.descripcion,
    contenido: row.contenido,
    costo: toNumber(row.costo),
    credencialesIncluidas: row.credencialesIncluidas,
    maxParticipantes: row.maxParticipantes,
    nivelMesa: row.nivelMesa,
    tipoParticipacion: row.tipoParticipacion,
    apareceEnCatalogo: row.apareceEnCatalogo === 1,
    logoEnWeb: row.logoEnWeb === 1,
    destacadoEnListados: row.destacadoEnListados === 1,
    urlQR: row.urlQR,
    orden: row.orden,
  };
}

function toColumns(definition: PackageDefinition) {
  return {
    nombre: definition.nombre,
    objetivo: definition.objetivo,
    descripcion: definition.descripcion,
    contenido: definition.contenido,
    costo: definition.costo,
    credencialesIncluidas: definition.credencialesIncluidas,
    maxParticipantes: definition.maxParticipantes,
    nivelMesa: definition.nivelMesa,
    tipoParticipacion: definition.tipoParticipacion,
    apareceEnCatalogo: definition.apareceEnCatalogo ? 1 : 0,
    logoEnWeb: definition.logoEnWeb ? 1 : 0,
    destacadoEnListados: definition.destacadoEnListados ? 1 : 0,
    urlQR: definition.urlQR,
    orden: definition.orden,
  };
}

@Injectable()
export class PrismaPackagesRepository implements PackagesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEventId(): Promise<number | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findAdministrableEventId(eventId?: number): Promise<number | null> {
    if (!eventId) return this.findPrincipalEventId();

    const row = await this.prisma.evento.findFirst({
      where: { id: eventId, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async list(eventId: number): Promise<PackageRecord[]> {
    const rows = await this.prisma.paquete.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: [...CATALOGUE_ORDER],
      select: PACKAGE_SELECT,
    });
    return rows.map(toPackage);
  }

  async listWithUsage(eventId: number): Promise<PackageUsage[]> {
    const rows = await this.prisma.paquete.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: [...CATALOGUE_ORDER],
      select: {
        ...PACKAGE_SELECT,
        _count: { select: { empresaevento: true, auspiciador: true } },
      },
    });

    return rows.map((row) => ({
      ...toPackage(row),
      empresas: row._count.empresaevento,
      auspiciadores: row._count.auspiciador,
    }));
  }

  async find(packageId: number): Promise<{ id: number; eventId: number } | null> {
    const row = await this.prisma.paquete.findFirst({
      where: { id: packageId, estaActivo: 1 },
      select: { id: true, evento_id: true },
    });
    return row ? { id: row.id, eventId: row.evento_id } : null;
  }

  async create(eventId: number, definition: PackageDefinition): Promise<PackageRecord> {
    const row = await this.prisma.paquete.create({
      data: { evento_id: eventId, estaActivo: 1, ...toColumns(definition) },
      select: PACKAGE_SELECT,
    });
    return toPackage(row);
  }

  async update(packageId: number, definition: PackageDefinition): Promise<PackageRecord> {
    const row = await this.prisma.paquete.update({
      where: { id: packageId },
      data: { ...toColumns(definition), creadoModificadoFecha: new Date() },
      select: PACKAGE_SELECT,
    });
    return toPackage(row);
  }

  async deactivate(packageId: number): Promise<void> {
    await this.prisma.paquete.update({
      where: { id: packageId },
      data: { estaActivo: 0, creadoModificadoFecha: new Date() },
    });
  }

  async countActive(eventId: number): Promise<number> {
    return this.prisma.paquete.count({ where: { evento_id: eventId, estaActivo: 1 } });
  }

  async countEnrollments(packageId: number): Promise<number> {
    return this.prisma.empresaevento.count({
      where: { paquete_id: packageId, estaActivo: 1 },
    });
  }

  async isPrincipal(eventId: number): Promise<boolean> {
    const row = await this.prisma.evento.findFirst({
      where: { id: eventId, esPrincipal: 1 },
      select: { id: true },
    });
    return row !== null;
  }

  async findOwnPackage(companyEventId: number): Promise<OwnPackageView | null> {
    const row = await this.prisma.empresaevento.findFirst({
      where: { id: companyEventId, estaActivo: 1 },
      select: {
        paquete: { select: PACKAGE_SELECT },
        evento: {
          select: { maxParticipantesPorEmpresa: true, cantidadParticipantesIncluidos: true },
        },
        empresa_usuario: { where: { estaActivo: 1 }, select: { id: true } },
      },
    });
    if (!row) return null;

    const bought = row.paquete ? toPackage(row.paquete) : null;
    // The cap can never be lower than what the package already includes.
    const maxParticipantes = bought
      ? Math.max(bought.maxParticipantes, bought.credencialesIncluidas)
      : (row.evento?.maxParticipantesPorEmpresa ?? WITHOUT_PACKAGE.maxParticipantes);
    const used = row.empresa_usuario.length;

    return {
      paqueteId: bought?.id ?? null,
      paqueteNombre: bought?.nombre ?? null,
      paqueteCosto: bought?.costo ?? null,
      beneficios: (bought?.contenido ?? '').split('\n').filter(Boolean),
      credencialesIncluidas:
        bought?.credencialesIncluidas ??
        row.evento?.cantidadParticipantesIncluidos ??
        WITHOUT_PACKAGE.credencialesIncluidas,
      maxParticipantes,
      nivelMesa: bought?.nivelMesa ?? 'NORMAL',
      apareceEnCatalogo: bought?.apareceEnCatalogo ?? true,
      logoEnWeb: bought?.logoEnWeb ?? false,
      destacadoEnListados: bought?.destacadoEnListados ?? false,
      participantesUsados: used,
      participantesDisponibles: Math.max(0, maxParticipantes - used),
    };
  }
}
