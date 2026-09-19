import { describe, expect, it } from 'vitest';
import {
  attendanceRows,
  meetingRows,
  rankingRows,
  resultRows,
  rosterRows,
} from './report-exports.js';

describe('rosterRows', () => {
  it('writes the registration day and fills what is missing with a dash', () => {
    const [row] = rosterRows([
      {
        nombre: 'Acme',
        rubro: 'Agroindustria',
        ciudad: null,
        pais: null,
        participantes: 2,
        cuposPagados: 4,
        estadoPago: 'COMPLETADO',
        acceso: 'HABILITADO',
        fechaRegistro: new Date('2026-09-18T13:00:00.000Z'),
      },
    ]);

    expect(row).toEqual({
      Empresa: 'Acme',
      Rubro: 'Agroindustria',
      Ciudad: '—',
      Pais: '—',
      Participantes: 2,
      CuposPagados: 4,
      EstadoPago: 'COMPLETADO',
      Acceso: 'HABILITADO',
      FechaRegistro: '2026-09-18',
    });
  });
});

describe('meetingRows', () => {
  it('writes the day and the hours in the event zone, not in UTC', () => {
    // 20:30 in Bolivia is already the next day in UTC: read in UTC the export
    // used to move the meeting to the following date.
    const [row] = meetingRows([
      {
        id: 1,
        inicio: new Date('2026-09-21T00:30:00.000Z'),
        fin: new Date('2026-09-21T00:50:00.000Z'),
        tipoReunion: 'PRESENCIAL',
        estadoReunion: 'FINALIZADA',
        numeroMesa: 5,
        solicitante: 'Acme',
        receptora: 'Beta',
      },
    ]);

    expect(row).toMatchObject({
      Fecha: '2026-09-20',
      HoraInicio: '20:30',
      HoraFin: '20:50',
      EmpresaSolicitante: 'Acme',
      EmpresaReceptora: 'Beta',
      Tipo: 'PRESENCIAL',
      Mesa: 5,
      Estado: 'FINALIZADA',
    });
  });

  it('writes a dash for a meeting with no table', () => {
    const [row] = meetingRows([
      {
        id: 1,
        inicio: new Date('2026-09-20T17:00:00.000Z'),
        fin: new Date('2026-09-20T17:20:00.000Z'),
        tipoReunion: 'VIRTUAL',
        estadoReunion: 'PROGRAMADA',
        numeroMesa: null,
        solicitante: null,
        receptora: 'Beta',
      },
    ]);

    expect(row).toMatchObject({ Mesa: '—', EmpresaSolicitante: '—' });
  });
});

describe('rankingRows', () => {
  it('writes what each company reported', () => {
    const [row] = rankingRows([
      {
        empresaEventoId: 1,
        nombre: 'Acme',
        codigo: 'RB-ACM-1',
        participantes: 2,
        reuniones: 3,
        estrellasDadas: 12,
        evaluacionesDadas: 3,
        promedioCalificacionDada: 4,
        dineroGenerado: 20000,
        asistencias: [],
        personasAsistentes: 0,
      },
    ]);

    expect(row).toEqual({
      Empresa: 'Acme',
      Codigo: 'RB-ACM-1',
      Reuniones: 3,
      EstrellasDadas: 12,
      EvaluacionesDadas: 3,
      PromedioCalificacionDada: 4,
      DineroGeneradoAproxUSD: 20000,
    });
  });
});

describe('attendanceRows', () => {
  it('counts the days a company came, not the times it scanned', () => {
    const [row] = attendanceRows([
      {
        empresaEventoId: 1,
        nombre: 'Acme',
        codigo: 'RB-ACM-1',
        participantes: 4,
        reuniones: 0,
        estrellasDadas: 0,
        evaluacionesDadas: 0,
        promedioCalificacionDada: 0,
        dineroGenerado: 0,
        asistencias: [
          new Date('2026-09-20T13:00:00.000Z'),
          new Date('2026-09-20T18:00:00.000Z'),
          new Date('2026-09-21T13:00:00.000Z'),
        ],
        personasAsistentes: 2,
      },
    ]);

    expect(row).toMatchObject({
      Empresa: 'Acme',
      ParticipantesRegistrados: 4,
      PersonasAsistentes: 2,
      RegistrosAsistencia: 3,
      DiasConAsistencia: 2,
    });
    expect(String(row?.HorariosIngreso)).toContain('|');
  });

  it('says so when a company never came', () => {
    const [row] = attendanceRows([
      {
        empresaEventoId: 1,
        nombre: 'Acme',
        codigo: 'RB-ACM-1',
        participantes: 4,
        reuniones: 0,
        estrellasDadas: 0,
        evaluacionesDadas: 0,
        promedioCalificacionDada: 0,
        dineroGenerado: 0,
        asistencias: [],
        personasAsistentes: 0,
      },
    ]);

    expect(row).toMatchObject({ DiasConAsistencia: 0, HorariosIngreso: 'Sin asistencia' });
  });
});

describe('resultRows', () => {
  it('writes the mark out of five and fills what is missing with a dash', () => {
    const [row] = resultRows([
      {
        fechaReunion: new Date('2026-09-20T17:00:00.000Z'),
        numeroMesa: null,
        empresaCalificadora: 'Acme',
        empresaCalificada: 'Beta',
        calificacion: 4,
        rangoAcuerdo: null,
        observaciones: null,
        registradoPor: 'Ana Rojas',
      },
    ]);

    expect(row).toEqual({
      FechaReunion: '2026-09-20',
      Mesa: '—',
      EmpresaCalificadora: 'Acme',
      EmpresaCalificada: 'Beta',
      Calificacion: '4/5',
      RangoAcuerdo: '—',
      Observaciones: '—',
      RegistradoPor: 'Ana Rojas',
    });
  });
});
