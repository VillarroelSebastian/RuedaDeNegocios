import { EVENT_TIME_ZONE, boliviaDateKey } from '../../../../shared/domain/bolivia-time.js';
import type { MeetingRow, ResultRow, RosterRow } from '../models/report-views.js';
import type { ImpactRankingRow } from './event-impact.js';

/**
 * Flat rows, ready for a table or a CSV. The keys are the column headings the
 * staff reads, so they stay in Spanish and are written exactly once here.
 */
export type ExportRow = Record<string, string | number>;

const MISSING = '—';
const TOP_MARK = 5;

/**
 * Days and hours are read in the event's zone. Read in UTC — as the legacy
 * export did — an evening meeting in Bolivia was filed under the next day.
 */
function day(instant: Date | null): string {
  return instant ? boliviaDateKey(instant) : MISSING;
}

/** A 24 hour clock: a spreadsheet can sort and parse it, "08:30 p. m." cannot. */
function clock(instant: Date): string {
  return instant.toLocaleTimeString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

function stamp(instant: Date): string {
  return instant.toLocaleString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function rosterRows(companies: RosterRow[]): ExportRow[] {
  return companies.map((company) => ({
    Empresa: company.nombre,
    Rubro: company.rubro ?? MISSING,
    Ciudad: company.ciudad ?? MISSING,
    Pais: company.pais ?? MISSING,
    Participantes: company.participantes,
    CuposPagados: company.cuposPagados,
    EstadoPago: company.estadoPago,
    Acceso: company.acceso,
    FechaRegistro: day(company.fechaRegistro),
  }));
}

export function meetingRows(meetings: MeetingRow[]): ExportRow[] {
  return meetings.map((meeting) => ({
    Fecha: day(meeting.inicio),
    HoraInicio: clock(meeting.inicio),
    HoraFin: clock(meeting.fin),
    EmpresaSolicitante: meeting.solicitante ?? MISSING,
    EmpresaReceptora: meeting.receptora ?? MISSING,
    Tipo: meeting.tipoReunion,
    Mesa: meeting.numeroMesa ?? MISSING,
    Estado: meeting.estadoReunion,
  }));
}

export function rankingRows(ranking: ImpactRankingRow[]): ExportRow[] {
  return ranking.map((company) => ({
    Empresa: company.nombre,
    Codigo: company.codigo,
    Reuniones: company.reuniones,
    EstrellasDadas: company.estrellasDadas,
    EvaluacionesDadas: company.evaluacionesDadas,
    PromedioCalificacionDada: company.promedioCalificacionDada,
    DineroGeneradoAproxUSD: company.dineroGenerado,
  }));
}

export function attendanceRows(ranking: ImpactRankingRow[]): ExportRow[] {
  return ranking.map((company) => {
    const days = new Set(company.asistencias.map((entry) => boliviaDateKey(entry)));

    return {
      Empresa: company.nombre,
      Codigo: company.codigo,
      ParticipantesRegistrados: company.participantes,
      PersonasAsistentes: company.personasAsistentes,
      RegistrosAsistencia: company.asistencias.length,
      DiasConAsistencia: days.size,
      HorariosIngreso:
        company.asistencias.length > 0
          ? company.asistencias.map(stamp).join(' | ')
          : 'Sin asistencia',
    };
  });
}

export function resultRows(results: ResultRow[]): ExportRow[] {
  return results.map((result) => ({
    FechaReunion: day(result.fechaReunion),
    Mesa: result.numeroMesa ?? MISSING,
    EmpresaCalificadora: result.empresaCalificadora ?? MISSING,
    EmpresaCalificada: result.empresaCalificada ?? MISSING,
    Calificacion: `${result.calificacion}/${TOP_MARK}`,
    RangoAcuerdo: result.rangoAcuerdo ?? MISSING,
    Observaciones: result.observaciones ?? MISSING,
    RegistradoPor: result.registradoPor ?? MISSING,
  }));
}
