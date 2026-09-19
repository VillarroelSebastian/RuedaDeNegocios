import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import type {
  ActivityRow,
  CompanyNextMeeting,
  MeetingRow,
  NewsRow,
  RecentEnrollment,
  ReportEvent,
} from '../../domain/models/report-views.js';
import { ACTIVITY_REPORT_PORT, type ActivityReportPort } from '../ports/activity-report.port.js';
import { COMPANY_REPORT_PORT, type CompanyReportPort } from '../ports/company-report.port.js';
import { EVENT_REPORT_PORT, type EventReportPort } from '../ports/event-report.port.js';
import { MEETING_REPORT_PORT, type MeetingReportPort } from '../ports/meeting-report.port.js';
import { NEWS_REPORT_PORT, type NewsReportPort } from '../ports/news-report.port.js';
import { REQUEST_REPORT_PORT, type RequestReportPort } from '../ports/request-report.port.js';
import { TABLE_REPORT_PORT, type TableReportPort } from '../ports/table-report.port.js';
import { EventImpactReader } from '../services/event-impact.reader.js';

const RECENT_ENROLLMENTS = 5;
const TOP_COMPANIES = 5;
const UPCOMING_MEETINGS = 8;
const UPCOMING_ACTIVITIES = 4;
const COMPANY_FEED = 3;

export interface AdminDashboard {
  totales: {
    empresas: number;
    pagosPendientes: number;
    reuniones: number;
    mesasActivas: number;
    eventos: number;
  };
  actividadReciente: RecentEnrollment[];
  topEmpresas: { empresaEventoId: number; nombre: string; reuniones: number }[];
}

/**
 * The administrator's landing page.
 *
 * The legacy route answered with the cards already styled — icons, Tailwind
 * classes, initials and a hardcoded "+0%". Those belong to whoever draws them,
 * so this hands over the figures alone.
 */
@Injectable()
export class GetAdminDashboardUseCase {
  constructor(
    @Inject(EVENT_REPORT_PORT) private readonly events: EventReportPort,
    @Inject(COMPANY_REPORT_PORT) private readonly companies: CompanyReportPort,
    @Inject(MEETING_REPORT_PORT) private readonly meetings: MeetingReportPort,
    @Inject(TABLE_REPORT_PORT) private readonly tables: TableReportPort,
    private readonly impact: EventImpactReader,
  ) {}

  async execute(): Promise<AdminDashboard> {
    const [event, eventos] = await Promise.all([
      this.events.findPrincipal(),
      this.events.countActive(),
    ]);

    if (!event) {
      return {
        totales: { empresas: 0, pagosPendientes: 0, reuniones: 0, mesasActivas: 0, eventos },
        actividadReciente: [],
        topEmpresas: [],
      };
    }

    const [empresas, pagosPendientes, reuniones, mesasActivas, actividadReciente, impact] =
      await Promise.all([
        this.companies.countEnrollments(event.id),
        this.companies.countByPaymentState(event.id, 'PENDIENTE'),
        this.meetings.countAll(event.id),
        this.tables.countActive(event.id),
        this.companies.listRecent(event.id, RECENT_ENROLLMENTS),
        this.impact.read(event.id),
      ]);

    return {
      totales: { empresas, pagosPendientes, reuniones, mesasActivas, eventos },
      actividadReciente,
      topEmpresas: impact.ranking.slice(0, TOP_COMPANIES).map((company) => ({
        empresaEventoId: company.empresaEventoId,
        nombre: company.nombre,
        reuniones: company.reuniones,
      })),
    };
  }
}

export interface StaffDashboard {
  evento: ReportEvent | null;
  totales: {
    reunionesEnCurso: number;
    proximasReuniones: number;
    reunionesVirtuales: number;
    mesasActivas: number;
  };
  proximasReuniones: MeetingRow[];
  proximasActividades: ActivityRow[];
}

/**
 * What the event team watches during the day.
 *
 * The legacy route handed back whole Prisma rows — the event, the meetings and
 * their nested includes — so the payload grew with the schema. Only what the
 * screen reads crosses the wire now.
 */
@Injectable()
export class GetStaffDashboardUseCase {
  constructor(
    @Inject(EVENT_REPORT_PORT) private readonly events: EventReportPort,
    @Inject(MEETING_REPORT_PORT) private readonly meetings: MeetingReportPort,
    @Inject(TABLE_REPORT_PORT) private readonly tables: TableReportPort,
    @Inject(ACTIVITY_REPORT_PORT) private readonly activities: ActivityReportPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<StaffDashboard> {
    const event = await this.events.findPrincipal();
    if (!event) {
      return {
        evento: null,
        totales: {
          reunionesEnCurso: 0,
          proximasReuniones: 0,
          reunionesVirtuales: 0,
          mesasActivas: 0,
        },
        proximasReuniones: [],
        proximasActividades: [],
      };
    }

    const now = this.clock.now();
    const [
      reunionesEnCurso,
      proximasReuniones,
      reunionesVirtuales,
      mesasActivas,
      agenda,
      proximasActividades,
    ] = await Promise.all([
      this.meetings.countByState(event.id, 'EN_CURSO'),
      this.meetings.countUpcoming(event.id, now),
      this.meetings.countVirtual(event.id),
      this.tables.countActive(event.id),
      this.meetings.listUpcoming(event.id, now, UPCOMING_MEETINGS),
      this.activities.listUpcoming(event.id, now, UPCOMING_ACTIVITIES),
    ]);

    return {
      evento: event,
      totales: { reunionesEnCurso, proximasReuniones, reunionesVirtuales, mesasActivas },
      proximasReuniones: agenda,
      proximasActividades,
    };
  }
}

export interface CompanyDashboard {
  pendientesRecibidas: number;
  pendientesEnviadas: number;
  reunionesTotal: number;
  pendientesEvaluar: number;
  proximaReunion: CompanyNextMeeting | null;
  comunicados: NewsRow[];
  actividades: ActivityRow[];
}

/** What a participating company sees when it signs in. */
@Injectable()
export class GetCompanyDashboardUseCase {
  constructor(
    @Inject(EVENT_REPORT_PORT) private readonly events: EventReportPort,
    @Inject(MEETING_REPORT_PORT) private readonly meetings: MeetingReportPort,
    @Inject(REQUEST_REPORT_PORT) private readonly requests: RequestReportPort,
    @Inject(NEWS_REPORT_PORT) private readonly news: NewsReportPort,
    @Inject(ACTIVITY_REPORT_PORT) private readonly activities: ActivityReportPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(companyEventId: number): Promise<CompanyDashboard> {
    const event = await this.events.findPrincipal();
    if (!event) {
      return {
        pendientesRecibidas: 0,
        pendientesEnviadas: 0,
        reunionesTotal: 0,
        pendientesEvaluar: 0,
        proximaReunion: null,
        comunicados: [],
        actividades: [],
      };
    }

    const now = this.clock.now();
    const [
      pendientesRecibidas,
      pendientesEnviadas,
      reunionesTotal,
      pendientesEvaluar,
      proximaReunion,
      comunicados,
      actividades,
    ] = await Promise.all([
      this.requests.countPendingReceived(event.id, companyEventId),
      this.requests.countPendingSent(event.id, companyEventId),
      this.meetings.countOfCompany(event.id, companyEventId),
      this.meetings.countAwaitingOutcome(event.id, companyEventId),
      this.meetings.findNextOfCompany(event.id, companyEventId, now),
      this.news.listLatest(event.id, COMPANY_FEED),
      this.activities.listUpcoming(event.id, now, COMPANY_FEED),
    ]);

    return {
      pendientesRecibidas,
      pendientesEnviadas,
      reunionesTotal,
      pendientesEvaluar,
      proximaReunion,
      comunicados,
      actividades,
    };
  }
}
