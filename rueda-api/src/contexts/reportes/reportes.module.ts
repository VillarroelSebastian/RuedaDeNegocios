import { Module } from '@nestjs/common';
import { ActividadesModule } from '../actividades/actividades.module.js';
import { AsistenciasModule } from '../asistencias/asistencias.module.js';
import { EmpresasModule } from '../empresas/empresas.module.js';
import { EventosModule } from '../eventos/eventos.module.js';
import { MesasModule } from '../mesas/mesas.module.js';
import { NoticiasModule } from '../noticias/noticias.module.js';
import { ReunionesModule } from '../reuniones/reuniones.module.js';
import { SolicitudesModule } from '../solicitudes/solicitudes.module.js';
import { EventImpactReader } from './application/services/event-impact.reader.js';
import {
  GetAdminDashboardUseCase,
  GetCompanyDashboardUseCase,
  GetStaffDashboardUseCase,
} from './application/use-cases/dashboards.use-cases.js';
import { GetEventStatisticsUseCase } from './application/use-cases/event-statistics.use-case.js';
import { ExportReportUseCase } from './application/use-cases/export-report.use-case.js';
import { SearchEventUseCase } from './application/use-cases/search-event.use-case.js';
import { ReportsController } from './infrastructure/http/reports.controller.js';

/**
 * Owns no table: it reads what every other context owns and turns it into the
 * figures the event is judged by. Each owner answers for its own part, so a
 * number can only ever mean one thing.
 */
@Module({
  imports: [
    EventosModule,
    EmpresasModule,
    ReunionesModule,
    MesasModule,
    SolicitudesModule,
    AsistenciasModule,
    ActividadesModule,
    NoticiasModule,
  ],
  controllers: [ReportsController],
  providers: [
    EventImpactReader,
    GetAdminDashboardUseCase,
    GetStaffDashboardUseCase,
    GetCompanyDashboardUseCase,
    GetEventStatisticsUseCase,
    ExportReportUseCase,
    SearchEventUseCase,
  ],
})
export class ReportesModule {}
