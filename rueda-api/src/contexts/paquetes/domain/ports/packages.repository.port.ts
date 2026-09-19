import type { PackageDefinition } from '../services/package-definition.js';

/** A package as the catalogue shows it. */
export interface PackageRecord {
  id: number;
  nombre: string;
  objetivo: string | null;
  descripcion: string | null;
  /** Benefits, one bullet per line. */
  contenido: string | null;
  costo: number;
  credencialesIncluidas: number;
  maxParticipantes: number;
  nivelMesa: string;
  tipoParticipacion: string;
  apareceEnCatalogo: boolean;
  logoEnWeb: boolean;
  destacadoEnListados: boolean;
  urlQR: string | null;
  orden: number;
}

/** The same package with how much of the event actually bought it. */
export interface PackageUsage extends PackageRecord {
  empresas: number;
  auspiciadores: number;
}

/** What one company's package entitles it to, and how much it has used. */
export interface OwnPackageView {
  paqueteId: number | null;
  paqueteNombre: string | null;
  paqueteCosto: number | null;
  beneficios: string[];
  credencialesIncluidas: number;
  maxParticipantes: number;
  nivelMesa: string;
  apareceEnCatalogo: boolean;
  logoEnWeb: boolean;
  destacadoEnListados: boolean;
  participantesUsados: number;
  participantesDisponibles: number;
}

export interface PackagesRepositoryPort {
  findPrincipalEventId(): Promise<number | null>;
  /** The event an administrator may curate: the one asked for, or the running one. */
  findAdministrableEventId(eventId?: number): Promise<number | null>;

  list(eventId: number): Promise<PackageRecord[]>;
  listWithUsage(eventId: number): Promise<PackageUsage[]>;
  find(packageId: number): Promise<{ id: number; eventId: number } | null>;

  create(eventId: number, definition: PackageDefinition): Promise<PackageRecord>;
  update(packageId: number, definition: PackageDefinition): Promise<PackageRecord>;
  deactivate(packageId: number): Promise<void>;

  /** Active packages left on that event, which the running one may not run out of. */
  countActive(eventId: number): Promise<number>;
  /** Enrollments already bought with the package; they must not be orphaned. */
  countEnrollments(packageId: number): Promise<number>;
  /** Whether the event is the one currently running. */
  isPrincipal(eventId: number): Promise<boolean>;

  findOwnPackage(companyEventId: number): Promise<OwnPackageView | null>;
}

export const PACKAGES_REPOSITORY = Symbol('PackagesRepositoryPort');
