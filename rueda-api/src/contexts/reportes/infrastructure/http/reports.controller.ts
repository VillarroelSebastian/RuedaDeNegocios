import { Controller, Get, Query } from '@nestjs/common';
import {
  type AuthenticatedUser,
  enrollmentOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  type AdminDashboard,
  type CompanyDashboard,
  GetAdminDashboardUseCase,
  GetCompanyDashboardUseCase,
  GetStaffDashboardUseCase,
  type StaffDashboard,
} from '../../application/use-cases/dashboards.use-cases.js';
import {
  type EventStatistics,
  GetEventStatisticsUseCase,
} from '../../application/use-cases/event-statistics.use-case.js';
import {
  ExportReportUseCase,
  type ReportExport,
} from '../../application/use-cases/export-report.use-case.js';
import {
  type EventSearchResults,
  SearchEventUseCase,
} from '../../application/use-cases/search-event.use-case.js';
import { ExportReportQueryDto, SearchEventQueryDto } from './dto/report.dto.js';

/**
 * What the event adds up to: the three dashboards, the statistics screen, the
 * exports and the search box.
 *
 * Replaces `GET /admin/dashboard/stats`, `GET /admin/estadisticas`,
 * `GET /admin/reportes`, `GET /tecnico/dashboard`, `GET /tecnico/buscar` and
 * `GET /empresa/dashboard-stats`. The company dashboard used to take the
 * enrollment from the query string; it now comes from the token.
 */
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly adminDashboard: GetAdminDashboardUseCase,
    private readonly staffDashboard: GetStaffDashboardUseCase,
    private readonly companyDashboard: GetCompanyDashboardUseCase,
    private readonly statistics: GetEventStatisticsUseCase,
    private readonly exportReport: ExportReportUseCase,
    private readonly search: SearchEventUseCase,
  ) {}

  @Roles(ROLES.ADMIN)
  @Get('dashboard/admin')
  admin(): Promise<AdminDashboard> {
    return this.adminDashboard.execute();
  }

  @Roles(ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS)
  @Get('dashboard/staff')
  staff(): Promise<StaffDashboard> {
    return this.staffDashboard.execute();
  }

  @Roles(ROLES.EMPRESA)
  @Get('dashboard/company')
  company(@CurrentUser() user: AuthenticatedUser): Promise<CompanyDashboard> {
    return this.companyDashboard.execute(enrollmentOf(user));
  }

  @Roles(ROLES.ADMIN)
  @Get('statistics')
  events(): Promise<EventStatistics> {
    return this.statistics.execute();
  }

  @Roles(ROLES.ADMIN)
  @Get('exports')
  exports(@Query() query: ExportReportQueryDto): Promise<ReportExport> {
    return this.exportReport.execute(query.tipo);
  }

  @Roles(ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS)
  @Get('search')
  find(@Query() query: SearchEventQueryDto): Promise<EventSearchResults> {
    return this.search.execute(query.q);
  }
}
