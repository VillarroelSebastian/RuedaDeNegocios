import { Controller, Get, Query } from '@nestjs/common';
import type { Paginated } from '../../../../shared/domain/pagination.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import { ListAuditLogUseCase } from '../../application/use-cases/list-audit-log.use-case.js';
import type { AuditLogEntry } from '../../domain/ports/audit-log.repository.port.js';
import { ListAuditLogQueryDto } from './dto/audit-log.dto.js';

/**
 * Who changed what, in the order it happened.
 *
 * Replaces `GET /admin/auditoria`. The legacy route answered with a bare array,
 * which left the caller unable to tell a last page from a full one; the page
 * now carries its total.
 */
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly listAuditLog: ListAuditLogUseCase) {}

  @Roles(ROLES.ADMIN)
  @Get()
  list(@Query() query: ListAuditLogQueryDto): Promise<Paginated<AuditLogEntry>> {
    return this.listAuditLog.execute(query);
  }
}
