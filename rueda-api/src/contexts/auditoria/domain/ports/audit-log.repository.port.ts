import type { Paginated } from '../../../../shared/domain/pagination.js';

export interface AuditLogFilters {
  /** Narrows the trail down to a single actor. */
  usuarioId?: number;
  page: number;
  limit: number;
}

/** One recorded state change, with the person behind it resolved. */
export interface AuditLogEntry {
  /** The column is a bigint, so it travels as text. */
  id: string;
  usuarioId: number | null;
  rol: string;
  accion: string;
  ruta: string;
  metodo: string;
  ip: string;
  /** Redacted request body, as it was stored. */
  detalles: string | null;
  fechaCreacion: Date;
  actorNombre: string | null;
  actorCorreo: string | null;
}

/**
 * Reading side of the trail the audit interceptor writes. The write lives in
 * `shared`, because it is cross-cutting; only the reading is a feature.
 */
export interface AuditLogRepositoryPort {
  list(filters: AuditLogFilters): Promise<Paginated<AuditLogEntry>>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AuditLogRepositoryPort');
