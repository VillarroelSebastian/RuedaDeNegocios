import { Module } from '@nestjs/common';
import { ListAuditLogUseCase } from './application/use-cases/list-audit-log.use-case.js';
import { AUDIT_LOG_REPOSITORY } from './domain/ports/audit-log.repository.port.js';
import { AuditLogController } from './infrastructure/http/audit-log.controller.js';
import { PrismaAuditLogRepository } from './infrastructure/persistence/prisma-audit-log.repository.js';

@Module({
  controllers: [AuditLogController],
  providers: [
    ListAuditLogUseCase,
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
  ],
})
export class AuditoriaModule {}
