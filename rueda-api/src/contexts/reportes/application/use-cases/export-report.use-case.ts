import { Inject, Injectable } from '@nestjs/common';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  type ExportRow,
  attendanceRows,
  meetingRows,
  rankingRows,
  resultRows,
  rosterRows,
} from '../../domain/services/report-exports.js';
import { COMPANY_REPORT_PORT, type CompanyReportPort } from '../ports/company-report.port.js';
import { EVENT_REPORT_PORT, type EventReportPort } from '../ports/event-report.port.js';
import { MEETING_REPORT_PORT, type MeetingReportPort } from '../ports/meeting-report.port.js';
import { EventImpactReader } from '../services/event-impact.reader.js';

export const EXPORT_KINDS = ['empresas', 'reuniones', 'resultados', 'ranking', 'asistencia'] as const;

export type ExportKind = (typeof EXPORT_KINDS)[number];

export interface ReportExport {
  tipo: string;
  filas: ExportRow[];
}

function isExportKind(value: string): value is ExportKind {
  return (EXPORT_KINDS as readonly string[]).includes(value);
}

/** Flat rows of the running event, ready for a table or a CSV. */
@Injectable()
export class ExportReportUseCase {
  constructor(
    @Inject(EVENT_REPORT_PORT) private readonly events: EventReportPort,
    @Inject(COMPANY_REPORT_PORT) private readonly companies: CompanyReportPort,
    @Inject(MEETING_REPORT_PORT) private readonly meetings: MeetingReportPort,
    private readonly impact: EventImpactReader,
  ) {}

  async execute(tipo: string): Promise<ReportExport> {
    if (!isExportKind(tipo)) {
      throw new ValidationError('tipo debe ser: empresas, reuniones, resultados, ranking o asistencia');
    }

    const event = await this.events.findPrincipal();
    if (!event) return { tipo, filas: [] };

    return { tipo, filas: await this.rowsOf(tipo, event.id) };
  }

  private async rowsOf(tipo: ExportKind, eventId: number): Promise<ExportRow[]> {
    switch (tipo) {
      case 'empresas':
        return rosterRows(await this.companies.listRoster(eventId));
      case 'reuniones':
        return meetingRows(await this.meetings.listForExport(eventId));
      case 'resultados':
        return resultRows(await this.meetings.listResultsForExport(eventId));
      case 'ranking':
        return rankingRows((await this.impact.read(eventId)).ranking);
      case 'asistencia':
        return attendanceRows((await this.impact.read(eventId)).ranking);
    }
  }
}
