import { describe, expect, it } from 'vitest';
import {
  type ImpactSources,
  approximateDealValue,
  summarizeImpact,
} from './event-impact.js';

function sources(overrides: Partial<ImpactSources> = {}): ImpactSources {
  return {
    enrollments: [],
    meetings: [],
    results: [],
    attendances: [],
    ...overrides,
  };
}

describe('approximateDealValue', () => {
  it('reads nothing out of a missing or empty range', () => {
    expect(approximateDealValue(null)).toBe(0);
    expect(approximateDealValue('')).toBe(0);
  });

  it('reads nothing out of a range that states there was no deal', () => {
    expect(approximateDealValue('Sin acuerdo comercial')).toBe(0);
  });

  it('reads the numbers of a range, dots and commas aside', () => {
    expect(approximateDealValue('De 10.000 a 50.000 USD')).toBe(50000);
  });

  it('takes the floor of an open range, which is the conservative estimate', () => {
    expect(approximateDealValue('Más de 100.000 USD')).toBe(100000);
  });

  it('reads nothing out of a range with no figures in it', () => {
    expect(approximateDealValue('Por definir')).toBe(0);
  });
});

describe('summarizeImpact', () => {
  const ACME = { empresaEventoId: 1, nombre: 'Acme', codigo: 'RB-ACM-1', participantes: 2 };
  const BETA = { empresaEventoId: 2, nombre: 'Beta', codigo: 'RB-BET-2', participantes: 3 };

  it('reports an empty event without dividing by zero', () => {
    const summary = summarizeImpact(sources());

    expect(summary).toMatchObject({
      ranking: [],
      totalGenerado: 0,
      acuerdosRegistrados: 0,
      evaluacionesRegistradas: 0,
      promedioCalificacion: 0,
      empresasAsistentes: 0,
      personasAsistentes: 0,
      indiceExito: 0,
    });
  });

  it('counts a meeting for both companies sitting at it', () => {
    const summary = summarizeImpact(
      sources({
        enrollments: [ACME, BETA],
        meetings: [{ estadoReunion: 'FINALIZADA', reunionId: 10, solicitanteId: 1, receptoraId: 2 }],
      }),
    );

    expect(summary.ranking.map((row) => [row.nombre, row.reuniones])).toEqual([
      ['Acme', 1],
      ['Beta', 1],
    ]);
  });

  it('credits the stars and the money to whoever reported them', () => {
    const summary = summarizeImpact(
      sources({
        enrollments: [ACME, BETA],
        meetings: [{ estadoReunion: 'FINALIZADA', reunionId: 10, solicitanteId: 1, receptoraId: 2 }],
        results: [
          {
            id: 1,
            reunionId: 10,
            calificadoraId: 1,
            calificacionReunion: 5,
            rangoAcuerdoComercial: 'De 10.000 a 20.000 USD',
          },
        ],
      }),
    );

    const acme = summary.ranking.find((row) => row.nombre === 'Acme');
    expect(acme).toMatchObject({
      estrellasDadas: 5,
      evaluacionesDadas: 1,
      promedioCalificacionDada: 5,
      dineroGenerado: 20000,
    });
    expect(summary.ranking.find((row) => row.nombre === 'Beta')?.dineroGenerado).toBe(0);
  });

  it('counts one estimate per meeting, the one reported with the highest mark', () => {
    const summary = summarizeImpact(
      sources({
        enrollments: [ACME, BETA],
        meetings: [{ estadoReunion: 'FINALIZADA', reunionId: 10, solicitanteId: 1, receptoraId: 2 }],
        results: [
          {
            id: 1,
            reunionId: 10,
            calificadoraId: 1,
            calificacionReunion: 3,
            rangoAcuerdoComercial: 'De 1.000 a 2.000 USD',
          },
          {
            id: 2,
            reunionId: 10,
            calificadoraId: 2,
            calificacionReunion: 5,
            rangoAcuerdoComercial: 'De 10.000 a 20.000 USD',
          },
        ],
      }),
    );

    // Both sides reported, but the event only made the deal once.
    expect(summary.totalGenerado).toBe(20000);
    expect(summary.acuerdosRegistrados).toBe(1);
    expect(summary.evaluacionesRegistradas).toBe(2);
    expect(summary.promedioCalificacion).toBe(4);
  });

  it('counts a company as present once, however many times it checked in', () => {
    const summary = summarizeImpact(
      sources({
        enrollments: [ACME, BETA],
        attendances: [
          {
            companyEventId: 1,
            membershipId: 100,
            fechaHoraAsistencia: new Date('2026-09-20T13:00:00.000Z'),
          },
          {
            companyEventId: 1,
            membershipId: 100,
            fechaHoraAsistencia: new Date('2026-09-21T13:00:00.000Z'),
          },
        ],
      }),
    );

    expect(summary.empresasAsistentes).toBe(1);
    expect(summary.personasAsistentes).toBe(1);
    expect(summary.registrosAsistencia).toBe(2);
    expect(summary.ranking.find((row) => row.nombre === 'Acme')?.asistencias).toHaveLength(2);
  });

  it('ranks by meetings first, then by stars, then by name', () => {
    const summary = summarizeImpact(
      sources({
        enrollments: [
          { empresaEventoId: 1, nombre: 'Zeta', codigo: null, participantes: 1 },
          { empresaEventoId: 2, nombre: 'Alfa', codigo: null, participantes: 1 },
          { empresaEventoId: 3, nombre: 'Omega', codigo: null, participantes: 1 },
        ],
        meetings: [{ estadoReunion: 'FINALIZADA', reunionId: 10, solicitanteId: 3, receptoraId: 1 }],
      }),
    );

    expect(summary.ranking.map((row) => row.nombre)).toEqual(['Omega', 'Zeta', 'Alfa']);
  });

  it('shows a company with no code as a dash, the way the export reads it', () => {
    const summary = summarizeImpact(
      sources({ enrollments: [{ ...ACME, codigo: null }] }),
    );

    expect(summary.ranking[0]?.codigo).toBe('—');
  });

  it('counts how many marks of each value were given', () => {
    const summary = summarizeImpact(
      sources({
        enrollments: [ACME],
        results: [
          { id: 1, reunionId: 10, calificadoraId: 1, calificacionReunion: 5, rangoAcuerdoComercial: null },
          { id: 2, reunionId: 11, calificadoraId: 1, calificacionReunion: 5, rangoAcuerdoComercial: null },
          { id: 3, reunionId: 12, calificadoraId: 1, calificacionReunion: 2, rangoAcuerdoComercial: null },
        ],
      }),
    );

    expect(summary.calificaciones).toEqual([
      { estrella: 1, total: 0 },
      { estrella: 2, total: 1 },
      { estrella: 3, total: 0 },
      { estrella: 4, total: 0 },
      { estrella: 5, total: 2 },
    ]);
  });

  it('weighs the success index over its four components', () => {
    const summary = summarizeImpact(
      sources({
        enrollments: [ACME, BETA],
        meetings: [{ estadoReunion: 'FINALIZADA', reunionId: 10, solicitanteId: 1, receptoraId: 2 }],
        results: [
          { id: 1, reunionId: 10, calificadoraId: 1, calificacionReunion: 5, rangoAcuerdoComercial: null },
        ],
        attendances: [
          {
            companyEventId: 1,
            membershipId: 100,
            fechaHoraAsistencia: new Date('2026-09-20T13:00:00.000Z'),
          },
        ],
      }),
    );

    // Every meeting ran (35), half the companies came (12.5 of 25), the mark was
    // perfect (25) and every meeting was surveyed (15).
    expect(summary.componentesIndice).toEqual({
      realizacion: 100,
      asistencia: 50,
      satisfaccion: 100,
      coberturaEncuestas: 100,
    });
    expect(summary.indiceExito).toBe(88);
  });
});
