import type { ClockPort } from '../../shared/application/ports/clock.port.js';
import type { TimeWindow } from '../../shared/domain/bolivia-time.js';
import type { ActivityReportPort } from './application/ports/activity-report.port.js';
import type { AttendanceReportPort } from './application/ports/attendance-report.port.js';
import type { CompanyReportPort } from './application/ports/company-report.port.js';
import type { EventReportPort } from './application/ports/event-report.port.js';
import type { MeetingReportPort } from './application/ports/meeting-report.port.js';
import type { NewsReportPort } from './application/ports/news-report.port.js';
import type { RequestReportPort } from './application/ports/request-report.port.js';
import type { TableReportPort } from './application/ports/table-report.port.js';
import type {
  ActivityRow,
  CompanyHit,
  CompanyNextMeeting,
  MeetingRow,
  NewsRow,
  RecentEnrollment,
  ReportEvent,
  ResultRow,
  RosterRow,
  SectorCount,
  TableRow,
} from './domain/models/report-views.js';
import type {
  ImpactAttendance,
  ImpactEnrollment,
  ImpactMeeting,
  ImpactResult,
} from './domain/services/event-impact.js';

/** In-memory doubles of every port the reporting context reads through. */

export const EVENT_ID = 4;
export const COMPANY_EVENT_ID = 11;

export function buildReportEvent(overrides: Partial<ReportEvent> = {}): ReportEvent {
  return {
    id: EVENT_ID,
    nombre: 'Rueda de Negocios Beni',
    inicio: new Date('2026-09-20T12:00:00.000Z'),
    fin: new Date('2026-09-21T22:00:00.000Z'),
    ...overrides,
  };
}

export function buildMeetingRow(overrides: Partial<MeetingRow> = {}): MeetingRow {
  return {
    id: 1,
    inicio: new Date('2026-09-20T17:00:00.000Z'),
    fin: new Date('2026-09-20T17:20:00.000Z'),
    tipoReunion: 'PRESENCIAL',
    estadoReunion: 'PROGRAMADA',
    numeroMesa: 5,
    solicitante: 'Acme',
    receptora: 'Beta',
    ...overrides,
  };
}

export class FakeEventReport implements EventReportPort {
  constructor(
    private readonly event: ReportEvent | null = buildReportEvent(),
    private readonly active = 2,
  ) {}

  async findPrincipal(): Promise<ReportEvent | null> {
    return this.event;
  }

  async countActive(): Promise<number> {
    return this.active;
  }
}

export interface FakeCompanyReportOptions {
  enrollments?: number;
  byPaymentState?: Record<string, number>;
  participants?: number;
  recent?: RecentEnrollment[];
  sectors?: SectorCount[];
  roster?: RosterRow[];
  impact?: ImpactEnrollment[];
  hits?: CompanyHit[];
}

export class FakeCompanyReport implements CompanyReportPort {
  readonly searched: string[] = [];

  constructor(private readonly options: FakeCompanyReportOptions = {}) {}

  async countEnrollments(): Promise<number> {
    return this.options.enrollments ?? 0;
  }

  async countByPaymentState(_eventId: number, estado: string): Promise<number> {
    return this.options.byPaymentState?.[estado] ?? 0;
  }

  async countParticipants(): Promise<number> {
    return this.options.participants ?? 0;
  }

  async listRecent(): Promise<RecentEnrollment[]> {
    return this.options.recent ?? [];
  }

  async listBySector(): Promise<SectorCount[]> {
    return this.options.sectors ?? [];
  }

  async listRoster(): Promise<RosterRow[]> {
    return this.options.roster ?? [];
  }

  async listForImpact(): Promise<ImpactEnrollment[]> {
    return this.options.impact ?? [];
  }

  async search(_eventId: number, term: string): Promise<CompanyHit[]> {
    this.searched.push(term);
    return this.options.hits ?? [];
  }
}

export interface FakeMeetingReportOptions {
  byState?: Record<string, number>;
  all?: number;
  virtual?: number;
  upcoming?: number;
  agenda?: MeetingRow[];
  forExport?: MeetingRow[];
  results?: ResultRow[];
  hits?: MeetingRow[];
  impact?: ImpactMeeting[];
  impactResults?: ImpactResult[];
  ofCompany?: number;
  awaiting?: number;
  next?: CompanyNextMeeting | null;
}

export class FakeMeetingReport implements MeetingReportPort {
  constructor(private readonly options: FakeMeetingReportOptions = {}) {}

  async countByState(_eventId: number, estado: string): Promise<number> {
    return this.options.byState?.[estado] ?? 0;
  }

  async countAll(): Promise<number> {
    return this.options.all ?? 0;
  }

  async countVirtual(): Promise<number> {
    return this.options.virtual ?? 0;
  }

  async countUpcoming(): Promise<number> {
    return this.options.upcoming ?? 0;
  }

  async listUpcoming(): Promise<MeetingRow[]> {
    return this.options.agenda ?? [];
  }

  async listForExport(): Promise<MeetingRow[]> {
    return this.options.forExport ?? [];
  }

  async listResultsForExport(): Promise<ResultRow[]> {
    return this.options.results ?? [];
  }

  async search(): Promise<MeetingRow[]> {
    return this.options.hits ?? [];
  }

  async listForImpact(): Promise<ImpactMeeting[]> {
    return this.options.impact ?? [];
  }

  async listResultsForImpact(): Promise<ImpactResult[]> {
    return this.options.impactResults ?? [];
  }

  async countOfCompany(): Promise<number> {
    return this.options.ofCompany ?? 0;
  }

  async countAwaitingOutcome(): Promise<number> {
    return this.options.awaiting ?? 0;
  }

  async findNextOfCompany(): Promise<CompanyNextMeeting | null> {
    return this.options.next ?? null;
  }
}

export class FakeTableReport implements TableReportPort {
  constructor(
    private readonly options: {
      active?: number;
      disabled?: number;
      tables?: TableRow[];
      hits?: TableRow[];
    } = {},
  ) {}

  async countActive(): Promise<number> {
    return this.options.active ?? 0;
  }

  async countDisabled(): Promise<number> {
    return this.options.disabled ?? 0;
  }

  async list(): Promise<TableRow[]> {
    return this.options.tables ?? [];
  }

  async search(): Promise<TableRow[]> {
    return this.options.hits ?? [];
  }
}

export class FakeRequestReport implements RequestReportPort {
  constructor(
    private readonly options: { received?: number; sent?: number } = {},
  ) {}

  async countPendingReceived(): Promise<number> {
    return this.options.received ?? 0;
  }

  async countPendingSent(): Promise<number> {
    return this.options.sent ?? 0;
  }
}

export class FakeAttendanceReport implements AttendanceReportPort {
  readonly days: TimeWindow[] = [];

  constructor(
    private readonly options: { impact?: ImpactAttendance[]; today?: number } = {},
  ) {}

  async listForImpact(): Promise<ImpactAttendance[]> {
    return this.options.impact ?? [];
  }

  async countPeopleIn(_eventId: number, day: TimeWindow): Promise<number> {
    this.days.push(day);
    return this.options.today ?? 0;
  }
}

export class FakeActivityReport implements ActivityReportPort {
  constructor(
    private readonly options: { total?: number; upcoming?: ActivityRow[] } = {},
  ) {}

  async countOfEvent(): Promise<number> {
    return this.options.total ?? 0;
  }

  async listUpcoming(): Promise<ActivityRow[]> {
    return this.options.upcoming ?? [];
  }
}

export class FakeNewsReport implements NewsReportPort {
  constructor(private readonly news: NewsRow[] = []) {}

  async listLatest(): Promise<NewsRow[]> {
    return this.news;
  }
}

export class FixedClock implements ClockPort {
  constructor(private readonly instant = new Date('2026-09-20T15:00:00.000Z')) {}

  now(): Date {
    return this.instant;
  }
}
