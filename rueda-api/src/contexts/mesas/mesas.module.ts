import { Module } from '@nestjs/common';
import { FREE_TABLES_PORT } from '../asistente/application/ports/free-tables.port.js';
import { TABLE_REPORT_PORT } from '../reportes/application/ports/table-report.port.js';
import { TABLE_PROVISIONING_PORT } from '../eventos/domain/ports/table-provisioning.port.js';
import { TABLE_ALLOCATION_PORT } from '../solicitudes/application/ports/table-allocation.port.js';
import {
  AddTablesUseCase,
  RemoveTableUseCase,
  UpdateTableUseCase,
} from './application/use-cases/manage-tables.use-cases.js';
import {
  GetTableOccupancyUseCase,
  GetTableUseCase,
  ListAvailableTablesUseCase,
  ListTablesUseCase,
} from './application/use-cases/read-tables.use-cases.js';
import { TABLES_REPOSITORY } from './domain/ports/tables.repository.port.js';
import { AssistantFreeTablesAdapter } from './infrastructure/adapters/assistant-free-tables.adapter.js';
import { ReportsTableAdapter } from './infrastructure/adapters/reports-table.adapter.js';
import { PrismaTableAllocationAdapter } from './infrastructure/adapters/prisma-table-allocation.adapter.js';
import { TablesController } from './infrastructure/http/tables.controller.js';
import { PrismaTableProvisioningAdapter } from './infrastructure/persistence/prisma-table-provisioning.adapter.js';
import { PrismaTablesRepository } from './infrastructure/persistence/prisma-tables.repository.js';

/**
 * Owns the tables, including how they are provisioned. The events context
 * declares `TABLE_PROVISIONING_PORT` because it is the one that triggers a sync
 * after its capacity changes, but the implementation belongs here.
 */
@Module({
  controllers: [TablesController],
  providers: [
    ListTablesUseCase,
    ListAvailableTablesUseCase,
    GetTableUseCase,
    GetTableOccupancyUseCase,
    AddTablesUseCase,
    UpdateTableUseCase,
    RemoveTableUseCase,
    PrismaTableProvisioningAdapter,
    { provide: TABLES_REPOSITORY, useClass: PrismaTablesRepository },
    { provide: TABLE_PROVISIONING_PORT, useExisting: PrismaTableProvisioningAdapter },
    { provide: TABLE_ALLOCATION_PORT, useClass: PrismaTableAllocationAdapter },
    // The assistant offers tables out of this same reading, cleanup included.
    { provide: FREE_TABLES_PORT, useClass: AssistantFreeTablesAdapter },
    { provide: TABLE_REPORT_PORT, useClass: ReportsTableAdapter },
  ],
  exports: [TABLE_PROVISIONING_PORT, TABLE_ALLOCATION_PORT, FREE_TABLES_PORT, TABLE_REPORT_PORT],
})
export class MesasModule {}
