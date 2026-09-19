import type {
  OwnPackageView,
  PackageRecord,
  PackageUsage,
  PackagesRepositoryPort,
} from './domain/ports/packages.repository.port.js';
import type { PackageDefinition } from './domain/services/package-definition.js';

/**
 * In-memory doubles for the packages context. They implement the port literally
 * so the use-case tests exercise real behaviour without a database.
 */

export const EVENT_ID = 7;
export const PACKAGE_ID = 3;

export function buildPackage(overrides: Partial<PackageRecord> = {}): PackageRecord {
  return {
    id: PACKAGE_ID,
    nombre: 'Paquete Beni',
    objetivo: null,
    descripcion: null,
    contenido: 'Podcast\nPantalla LED',
    costo: 1500,
    credencialesIncluidas: 2,
    maxParticipantes: 4,
    nivelMesa: 'NORMAL',
    tipoParticipacion: 'PRESENCIAL',
    apareceEnCatalogo: true,
    logoEnWeb: false,
    destacadoEnListados: false,
    urlQR: null,
    orden: 0,
    ...overrides,
  };
}

export interface FakePackagesOptions {
  eventId?: number | null;
  packages?: PackageRecord[];
  usage?: PackageUsage[];
  existing?: { id: number; eventId: number } | null;
  principal?: boolean;
  active?: number;
  enrollments?: number;
  own?: OwnPackageView | null;
}

export class FakePackagesRepository implements PackagesRepositoryPort {
  readonly created: { eventId: number; definition: PackageDefinition }[] = [];
  readonly updated: { packageId: number; definition: PackageDefinition }[] = [];
  readonly deactivated: number[] = [];

  constructor(private readonly options: FakePackagesOptions = {}) {}

  async findPrincipalEventId(): Promise<number | null> {
    return this.options.eventId === undefined ? EVENT_ID : this.options.eventId;
  }

  async findAdministrableEventId(): Promise<number | null> {
    return this.options.eventId === undefined ? EVENT_ID : this.options.eventId;
  }

  async list(): Promise<PackageRecord[]> {
    return this.options.packages ?? [buildPackage()];
  }

  async listWithUsage(): Promise<PackageUsage[]> {
    return this.options.usage ?? [{ ...buildPackage(), empresas: 4, auspiciadores: 1 }];
  }

  async find(): Promise<{ id: number; eventId: number } | null> {
    return this.options.existing === undefined
      ? { id: PACKAGE_ID, eventId: EVENT_ID }
      : this.options.existing;
  }

  async create(eventId: number, definition: PackageDefinition): Promise<PackageRecord> {
    this.created.push({ eventId, definition });
    return buildPackage({ id: 99, nombre: definition.nombre });
  }

  async update(packageId: number, definition: PackageDefinition): Promise<PackageRecord> {
    this.updated.push({ packageId, definition });
    return buildPackage({ id: packageId, nombre: definition.nombre });
  }

  async deactivate(packageId: number): Promise<void> {
    this.deactivated.push(packageId);
  }

  async countActive(): Promise<number> {
    return this.options.active ?? 3;
  }

  async countEnrollments(): Promise<number> {
    return this.options.enrollments ?? 0;
  }

  async isPrincipal(): Promise<boolean> {
    return this.options.principal ?? true;
  }

  async findOwnPackage(): Promise<OwnPackageView | null> {
    if (this.options.own !== undefined) return this.options.own;

    return {
      paqueteId: PACKAGE_ID,
      paqueteNombre: 'Paquete Beni',
      paqueteCosto: 1500,
      beneficios: ['Podcast', 'Pantalla LED'],
      credencialesIncluidas: 2,
      maxParticipantes: 4,
      nivelMesa: 'NORMAL',
      apareceEnCatalogo: true,
      logoEnWeb: false,
      destacadoEnListados: false,
      participantesUsados: 3,
      participantesDisponibles: 1,
    };
  }
}
