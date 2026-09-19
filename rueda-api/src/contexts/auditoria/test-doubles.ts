import type { Paginated } from '../../shared/domain/pagination.js';
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogRepositoryPort,
} from './domain/ports/audit-log.repository.port.js';

/**
 * In-memory double for the audit log. It implements the port literally, so the
 * use-case test exercises real behaviour without a database.
 */

export function buildAuditEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: '41',
    usuarioId: 8,
    rol: 'ADMINISTRADOR',
    accion: 'POST /api/v1/packages',
    ruta: '/api/v1/packages',
    metodo: 'POST',
    ip: '10.0.0.4',
    detalles: '{"nombre":"Paquete Beni"}',
    fechaCreacion: new Date('2026-09-18T12:00:00.000Z'),
    actorNombre: 'Ana Rojas',
    actorCorreo: 'ana@uma.bo',
    ...overrides,
  };
}

export interface FakeAuditLogOptions {
  page?: Paginated<AuditLogEntry>;
}

export class FakeAuditLogRepository implements AuditLogRepositoryPort {
  readonly listCalls: AuditLogFilters[] = [];

  constructor(private readonly options: FakeAuditLogOptions = {}) {}

  async list(filters: AuditLogFilters): Promise<Paginated<AuditLogEntry>> {
    this.listCalls.push(filters);

    return (
      this.options.page ?? {
        data: [buildAuditEntry()],
        total: 1,
        page: filters.page,
        limit: filters.limit,
      }
    );
  }
}
