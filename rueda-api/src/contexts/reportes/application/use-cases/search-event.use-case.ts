import { Inject, Injectable } from '@nestjs/common';
import type { CompanyHit, MeetingRow, TableRow } from '../../domain/models/report-views.js';
import { COMPANY_REPORT_PORT, type CompanyReportPort } from '../ports/company-report.port.js';
import { EVENT_REPORT_PORT, type EventReportPort } from '../ports/event-report.port.js';
import { MEETING_REPORT_PORT, type MeetingReportPort } from '../ports/meeting-report.port.js';
import { TABLE_REPORT_PORT, type TableReportPort } from '../ports/table-report.port.js';

export interface EventSearchResults {
  empresas: CompanyHit[];
  reuniones: MeetingRow[];
  mesas: TableRow[];
}

const NOTHING: EventSearchResults = { empresas: [], reuniones: [], mesas: [] };

/** The one search box the event team uses: companies, meetings and tables. */
@Injectable()
export class SearchEventUseCase {
  constructor(
    @Inject(EVENT_REPORT_PORT) private readonly events: EventReportPort,
    @Inject(COMPANY_REPORT_PORT) private readonly companies: CompanyReportPort,
    @Inject(MEETING_REPORT_PORT) private readonly meetings: MeetingReportPort,
    @Inject(TABLE_REPORT_PORT) private readonly tables: TableReportPort,
  ) {}

  async execute(query: string | undefined): Promise<EventSearchResults> {
    const term = query?.trim() ?? '';
    if (!term) return NOTHING;

    const event = await this.events.findPrincipal();
    if (!event) return NOTHING;

    const [empresas, reuniones, mesas] = await Promise.all([
      this.companies.search(event.id, term),
      this.meetings.search(event.id, term),
      this.tables.search(event.id, term),
    ]);

    return { empresas, reuniones, mesas };
  }
}
