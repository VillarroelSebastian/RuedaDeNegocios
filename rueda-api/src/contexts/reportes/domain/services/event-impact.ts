/**
 * What the event added up to: how much each company met, how it rated those
 * meetings, how much business it reported and how often it showed up.
 *
 * Every figure is derived here, out of rows the owning contexts hand over, so
 * the dashboards, the statistics screen and the exports can never disagree
 * about what the same number means.
 */

export interface ImpactEnrollment {
  empresaEventoId: number;
  nombre: string;
  codigo: string | null;
  participantes: number;
}

/** A meeting that was not cancelled, and the two companies sitting at it. */
export interface ImpactMeeting {
  reunionId: number;
  estadoReunion: string;
  solicitanteId: number | null;
  receptoraId: number | null;
}

export interface ImpactResult {
  id: number;
  reunionId: number;
  calificadoraId: number;
  calificacionReunion: number;
  rangoAcuerdoComercial: string | null;
}

export interface ImpactAttendance {
  companyEventId: number | null;
  membershipId: number;
  fechaHoraAsistencia: Date;
}

export interface ImpactSources {
  enrollments: ImpactEnrollment[];
  meetings: ImpactMeeting[];
  results: ImpactResult[];
  attendances: ImpactAttendance[];
}

export interface ImpactRankingRow {
  empresaEventoId: number;
  nombre: string;
  codigo: string;
  participantes: number;
  reuniones: number;
  estrellasDadas: number;
  evaluacionesDadas: number;
  promedioCalificacionDada: number;
  dineroGenerado: number;
  asistencias: Date[];
  personasAsistentes: number;
}

export interface ImpactIndexComponents {
  realizacion: number;
  asistencia: number;
  satisfaccion: number;
  coberturaEncuestas: number;
}

export interface ImpactSummary {
  ranking: ImpactRankingRow[];
  totalGenerado: number;
  acuerdosRegistrados: number;
  evaluacionesRegistradas: number;
  promedioCalificacion: number;
  empresasAsistentes: number;
  personasAsistentes: number;
  registrosAsistencia: number;
  calificaciones: { estrella: number; total: number }[];
  indiceExito: number;
  componentesIndice: ImpactIndexComponents;
}

const NO_CODE = '—';
const MARKS = [1, 2, 3, 4, 5];
const TOP_MARK = 5;

/** How the success index weighs each of the four things it is made of. */
const WEIGHTS = {
  realizacion: 0.35,
  asistencia: 0.25,
  satisfaccion: 0.25,
  coberturaEncuestas: 0.15,
} as const;

/**
 * What a reported deal range is worth, in round figures. An open range — "more
 * than X" — is read at its floor, which keeps the estimate conservative.
 */
export function approximateDealValue(range: string | null | undefined): number {
  const stated = String(range ?? '').toLowerCase();
  if (!stated || stated.includes('sin acuerdo')) return 0;

  const amounts = (stated.match(/\d[\d.,]*/g) ?? [])
    .map((figure) => Number(figure.replace(/[.,]/g, '')))
    .filter(Number.isFinite);

  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

function twoDecimals(value: number): number {
  return Number(value.toFixed(2));
}

function percent(ratio: number): number {
  return Math.round(ratio * 100);
}

interface Tally extends Omit<ImpactRankingRow, 'personasAsistentes' | 'promedioCalificacionDada'> {
  attendees: Set<number>;
}

export function summarizeImpact(sources: ImpactSources): ImpactSummary {
  const tallies = new Map<number, Tally>(
    sources.enrollments.map((enrollment) => [
      enrollment.empresaEventoId,
      {
        empresaEventoId: enrollment.empresaEventoId,
        nombre: enrollment.nombre,
        codigo: enrollment.codigo ?? NO_CODE,
        participantes: enrollment.participantes,
        reuniones: 0,
        estrellasDadas: 0,
        evaluacionesDadas: 0,
        dineroGenerado: 0,
        asistencias: [],
        attendees: new Set<number>(),
      },
    ]),
  );

  for (const meeting of sources.meetings) {
    for (const side of [meeting.solicitanteId, meeting.receptoraId]) {
      const tally = side == null ? undefined : tallies.get(side);
      if (tally) tally.reuniones += 1;
    }
  }

  // One meeting, one estimate: the one reported with the highest mark, and on a
  // tie the first that came in. Each company still keeps what it reported.
  const perMeeting = new Map<number, ImpactResult>();
  for (const result of sources.results) {
    const tally = tallies.get(result.calificadoraId);
    if (tally) {
      tally.estrellasDadas += result.calificacionReunion;
      tally.evaluacionesDadas += 1;
      tally.dineroGenerado += approximateDealValue(result.rangoAcuerdoComercial);
    }

    const chosen = perMeeting.get(result.reunionId);
    if (!chosen || result.calificacionReunion > chosen.calificacionReunion) {
      perMeeting.set(result.reunionId, result);
    }
  }

  for (const attendance of sources.attendances) {
    const tally = attendance.companyEventId == null ? undefined : tallies.get(attendance.companyEventId);
    if (tally) {
      tally.asistencias.push(attendance.fechaHoraAsistencia);
      tally.attendees.add(attendance.membershipId);
    }
  }

  const ranking: ImpactRankingRow[] = [...tallies.values()]
    .map(({ attendees, ...tally }) => ({
      ...tally,
      personasAsistentes: attendees.size,
      promedioCalificacionDada:
        tally.evaluacionesDadas > 0 ? twoDecimals(tally.estrellasDadas / tally.evaluacionesDadas) : 0,
    }))
    .sort(
      (left, right) =>
        right.reuniones - left.reuniones ||
        right.estrellasDadas - left.estrellasDadas ||
        left.nombre.localeCompare(right.nombre, 'es'),
    );

  const chosenResults = [...perMeeting.values()];
  const totalGenerado = chosenResults.reduce(
    (total, result) => total + approximateDealValue(result.rangoAcuerdoComercial),
    0,
  );
  const promedioCalificacion =
    sources.results.length > 0
      ? twoDecimals(
          sources.results.reduce((total, result) => total + result.calificacionReunion, 0) /
            sources.results.length,
        )
      : 0;

  const empresasAsistentes = ranking.filter((row) => row.asistencias.length > 0).length;
  const personasAsistentes = new Set(sources.attendances.map((entry) => entry.membershipId)).size;
  const finished = sources.meetings.filter((meeting) => meeting.estadoReunion === 'FINALIZADA').length;

  const realizacion = sources.meetings.length > 0 ? finished / sources.meetings.length : 0;
  const asistencia = ranking.length > 0 ? empresasAsistentes / ranking.length : 0;
  const satisfaccion = promedioCalificacion / TOP_MARK;
  const coberturaEncuestas = finished > 0 ? Math.min(1, perMeeting.size / finished) : 0;

  return {
    ranking,
    totalGenerado,
    acuerdosRegistrados: chosenResults.filter(
      (result) => approximateDealValue(result.rangoAcuerdoComercial) > 0,
    ).length,
    evaluacionesRegistradas: sources.results.length,
    promedioCalificacion,
    empresasAsistentes,
    personasAsistentes,
    registrosAsistencia: sources.attendances.length,
    calificaciones: MARKS.map((estrella) => ({
      estrella,
      total: sources.results.filter((result) => result.calificacionReunion === estrella).length,
    })),
    indiceExito: percent(
      realizacion * WEIGHTS.realizacion +
        asistencia * WEIGHTS.asistencia +
        satisfaccion * WEIGHTS.satisfaccion +
        coberturaEncuestas * WEIGHTS.coberturaEncuestas,
    ),
    componentesIndice: {
      realizacion: percent(realizacion),
      asistencia: percent(asistencia),
      satisfaccion: percent(satisfaccion),
      coberturaEncuestas: percent(coberturaEncuestas),
    },
  };
}
