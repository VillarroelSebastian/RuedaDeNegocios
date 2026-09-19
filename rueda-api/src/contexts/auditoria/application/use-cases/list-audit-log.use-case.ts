import { Inject, Injectable } from '@nestjs/common';
import { type Paginated, clampLimit, clampPage } from '../../../../shared/domain/pagination.js';
import {
  AUDIT_LOG_REPOSITORY,
  type AuditLogEntry,
  type AuditLogRepositoryPort,
} from '../../domain/ports/audit-log.repository.port.js';

export interface ListAuditLogQuery {
  usuarioId?: number;
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
/** The trail grows without bound, so a page is never allowed to be unbounded. */
const MAX_LIMIT = 200;

/** What the administrator reads to find out who changed what. */
@Injectable()
export class ListAuditLogUseCase {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly entries: AuditLogRepositoryPort) {}

  execute(query: ListAuditLogQuery): Promise<Paginated<AuditLogEntry>> {
    return this.entries.list({
      usuarioId: query.usuarioId,
      page: clampPage(query.page),
      limit: clampLimit(query.limit, DEFAULT_LIMIT, MAX_LIMIT),
    });
  }
}
