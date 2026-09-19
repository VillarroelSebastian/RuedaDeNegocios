import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import { boliviaDateKey, boliviaDateTime } from '../../../../shared/domain/bolivia-time.js';
import type { SectorCount, TableRow } from '../../domain/models/report-views.js';
import type { ImpactIndexComponents, ImpactRankingRow } from '../../domain/services/event-impact.js';
import { ACTIVITY_REPORT_PORT, type ActivityReportPort } from '../ports/activity-report.port.js';
import {
  ATTENDANCE_REPORT_PORT,
  type AttendanceReportPort,
} from '../ports/attendance-report.port.js';
import { COMPANY_REPORT_PORT, type CompanyReportPort } from '../ports/company-report.port.js';
import { EVENT_REPORT_PORT, type EventReportPort } from '../ports/event-report.port.js';
import { MEETING_REPORT_PORT, type MeetingReportPort } from '../ports/meeting-report.port.js';
import { TABLE_REPORT_PORT, type TableReportPort } from '../ports/table-report.port.js';
import { EventImpactReader } from '../services/event-impact.reader.js';

const TOP_COMPANIES = 5;
const TOP_SECTORS = 5;

const INDEX_EXPLANATION =
  'Índice compuesto: realización de reuniones (35%), asistencia empresarial (25%), satisfacción (25%) y cobertura de encuestas (15%).';

export interface EventStatistics {
  kpis: Record<string, number>;
  reunionesPorEstado: Record<string, number>;
  topEmpresas: { nombre: string; total: number }[];
  rankingEmpresas: ImpactRankingRow[];
  calificaciones: { estrella: number; total: number }[];
  asistencia: Record<string, number>;
  indiceExito: { valor: number; componentes: ImpactIndexComponents; descripcion: string };
  pagosPorEstado: Record<string, number>;
  mesas: TableRow[];
  mesasActivas: number;
  mesasInhabilitadas: number;
  empresasPorRubro: SectorCount[];
}

const EMPTY: EventStatistics = {
  kpis: {},
  reunionesPorEstado: {},
  topEmpresas: [],
  rankingEmpresas: [],
  calificaciones: [],
  asistencia: {},
  indiceExito: {
    valor: 0,
    componentes: { realizacion: 0, asistencia: 0, satisfaccion: 0, coberturaEncuestas: 0 },
    descripcion: INDEX_EXPLANATION,
  },
  pagosPorEstado: {},
  mesas: [],
  mesasActivas: 0,
  mesasInhabilitadas: 0,
  empresasPorRubro: [],
};

function share(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Everything the statistics screen shows, read from one consistent snapshot. */
@Injectable()
export class GetEventStatisticsUseCase {
  constructor(
    @Inject(EVENT_REPORT_PORT) private readonly events: EventReportPort,
    @Inject(COMPANY_REPORT_PORT) private readonly companies: CompanyReportPort,
    @Inject(MEETING_REPORT_PORT) private readonly meetings: MeetingReportPort,
    @Inject(TABLE_REPORT_PORT) private readonly tables: TableReportPort,
    @Inject(ACTIVITY_REPORT_PORT) private readonly activities: ActivityReportPort,
    @Inject(ATTENDANCE_REPORT_PORT) private readonly attendance: AttendanceReportPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    private readonly impact: EventImpactReader,
  ) {}

  async execute(): Promise<EventStatistics> {
    const event = await this.events.findPrincipal();
    if (!event) return EMPTY;

    const [
      empresasTotal,
      participantesTotal,
      programadas,
      finalizadas,
      enCurso,
      canceladas,
      reprogramadas,
      pagosVerificados,
      pagosPendientes,
      pagosObservados,
      mesasActivas,
      mesasInhabilitadas,
      eventosInternos,
      mesas,
      empresasPorRubro,
      asistentesHoy,
      impact,
    ] = await Promise.all([
      this.companies.countEnrollments(event.id),
      this.companies.countParticipants(event.id),
      this.meetings.countByState(event.id, 'PROGRAMADA'),
      this.meetings.countByState(event.id, 'FINALIZADA'),
      this.meetings.countByState(event.id, 'EN_CURSO'),
      this.meetings.countByState(event.id, 'CANCELADA'),
      this.meetings.countByState(event.id, 'REPROGRAMADA'),
      this.companies.countByPaymentState(event.id, 'COMPLETADO'),
      this.companies.countByPaymentState(event.id, 'PENDIENTE'),
      this.companies.countByPaymentState(event.id, 'OBSERVADO'),
      this.tables.countActive(event.id),
      this.tables.countDisabled(event.id),
      this.activities.countOfEvent(event.id),
      this.tables.list(event.id),
      this.companies.listBySector(event.id, TOP_SECTORS),
      this.attendance.countPeopleIn(event.id, this.today()),
      this.impact.read(event.id),
    ]);

    const noCanceladas = programadas + finalizadas + enCurso + reprogramadas;
    const reunionesTotal = noCanceladas + canceladas;
    const pagosTotal = pagosVerificados + pagosPendientes + pagosObservados;

    return {
      kpis: {
        empresasRegistradas: empresasTotal,
        participantesTotales: participantesTotal,
        reunionesProgramadas: programadas,
        reunionesNoCanceladas: noCanceladas,
        reunionesRealizadas: finalizadas,
        acuerdosRegistrados: impact.acuerdosRegistrados,
        evaluacionesRegistradas: impact.evaluacionesRegistradas,
        tasaAcuerdos: share(impact.acuerdosRegistrados, finalizadas),
        tasaRealizacion: share(finalizadas, noCanceladas),
        pagosVerificados,
        pagosPendientes,
        mesasHabilitadas: mesasActivas,
        eventosInternos,
        asistentesHoy,
        empresasAsistentes: impact.empresasAsistentes,
        personasAsistentes: impact.personasAsistentes,
        totalGeneradoAprox: impact.totalGenerado,
        promedioCalificacion: impact.promedioCalificacion,
        indiceExito: impact.indiceExito,
      },
      reunionesPorEstado: {
        programadas,
        enCurso,
        finalizadas,
        canceladas,
        reprogramadas,
        total: reunionesTotal,
      },
      topEmpresas: impact.ranking
        .slice(0, TOP_COMPANIES)
        .map((company) => ({ nombre: company.nombre, total: company.reuniones })),
      rankingEmpresas: impact.ranking,
      calificaciones: impact.calificaciones,
      asistencia: {
        empresasRegistradas: empresasTotal,
        empresasAsistentes: impact.empresasAsistentes,
        empresasSinAsistencia: Math.max(0, empresasTotal - impact.empresasAsistentes),
        personasRegistradas: participantesTotal,
        personasAsistentes: impact.personasAsistentes,
        personasSinAsistencia: Math.max(0, participantesTotal - impact.personasAsistentes),
        registros: impact.registrosAsistencia,
      },
      indiceExito: {
        valor: impact.indiceExito,
        componentes: impact.componentesIndice,
        descripcion: INDEX_EXPLANATION,
      },
      pagosPorEstado: {
        verificados: pagosVerificados,
        pendientes: pagosPendientes,
        observados: pagosObservados,
        total: pagosTotal,
        porcentajeVerificados: share(pagosVerificados, pagosTotal),
        porcentajePendientes: share(pagosPendientes, pagosTotal),
        porcentajeObservados: share(pagosObservados, pagosTotal),
      },
      mesas,
      mesasActivas,
      mesasInhabilitadas,
      empresasPorRubro,
    };
  }

  /** The day as the venue lives it, not as the server's clock reads it. */
  private today() {
    const key = boliviaDateKey(this.clock.now());

    return { start: boliviaDateTime(key, 0, 0), end: boliviaDateTime(key, 24, 0) };
  }
}
