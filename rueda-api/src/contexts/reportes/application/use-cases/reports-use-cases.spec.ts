import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  COMPANY_EVENT_ID,
  FakeActivityReport,
  FakeAttendanceReport,
  FakeCompanyReport,
  FakeEventReport,
  FakeMeetingReport,
  FakeNewsReport,
  FakeRequestReport,
  FakeTableReport,
  FixedClock,
  buildMeetingRow,
} from '../../test-doubles.js';
import { EventImpactReader } from '../services/event-impact.reader.js';
import {
  GetAdminDashboardUseCase,
  GetCompanyDashboardUseCase,
  GetStaffDashboardUseCase,
} from './dashboards.use-cases.js';
import { GetEventStatisticsUseCase } from './event-statistics.use-case.js';
import { ExportReportUseCase } from './export-report.use-case.js';
import { SearchEventUseCase } from './search-event.use-case.js';

function readerOf(companies = new FakeCompanyReport(), meetings = new FakeMeetingReport()) {
  return new EventImpactReader(companies, meetings, new FakeAttendanceReport());
}

describe('GetAdminDashboardUseCase', () => {
  it('still counts the events when none is running', async () => {
    const dashboard = await new GetAdminDashboardUseCase(
      new FakeEventReport(null, 3),
      new FakeCompanyReport(),
      new FakeMeetingReport(),
      new FakeTableReport(),
      readerOf(),
    ).execute();

    expect(dashboard.totales).toEqual({
      empresas: 0,
      pagosPendientes: 0,
      reuniones: 0,
      mesasActivas: 0,
      eventos: 3,
    });
    expect(dashboard.topEmpresas).toEqual([]);
  });

  it('reports the figures alone, with no styling in them', async () => {
    const companies = new FakeCompanyReport({
      enrollments: 12,
      byPaymentState: { PENDIENTE: 4 },
      impact: [
        { empresaEventoId: 1, nombre: 'Acme', codigo: 'RB-ACM-1', participantes: 2 },
        { empresaEventoId: 2, nombre: 'Beta', codigo: 'RB-BET-2', participantes: 2 },
      ],
      recent: [
        {
          empresaEventoId: 9,
          empresa: 'Gamma',
          rubro: 'Turismo',
          tipoParticipacion: 'PRESENCIAL',
          estadoPago: 'PENDIENTE',
          fechaRegistro: new Date('2026-09-18T13:00:00.000Z'),
        },
      ],
    });
    const meetings = new FakeMeetingReport({
      all: 7,
      impact: [
        { reunionId: 10, estadoReunion: 'FINALIZADA', solicitanteId: 1, receptoraId: 2 },
        { reunionId: 11, estadoReunion: 'PROGRAMADA', solicitanteId: 1, receptoraId: 2 },
      ],
    });

    const dashboard = await new GetAdminDashboardUseCase(
      new FakeEventReport(),
      companies,
      meetings,
      new FakeTableReport({ active: 6 }),
      readerOf(companies, meetings),
    ).execute();

    expect(dashboard.totales).toEqual({
      empresas: 12,
      pagosPendientes: 4,
      reuniones: 7,
      mesasActivas: 6,
      eventos: 2,
    });
    expect(dashboard.topEmpresas).toEqual([
      { empresaEventoId: 1, nombre: 'Acme', reuniones: 2 },
      { empresaEventoId: 2, nombre: 'Beta', reuniones: 2 },
    ]);
    expect(dashboard.actividadReciente[0]?.empresa).toBe('Gamma');
    expect(JSON.stringify(dashboard)).not.toContain('bg-green');
  });
});

describe('GetStaffDashboardUseCase', () => {
  it('answers with an empty board while no event is running', async () => {
    const dashboard = await new GetStaffDashboardUseCase(
      new FakeEventReport(null),
      new FakeMeetingReport(),
      new FakeTableReport(),
      new FakeActivityReport(),
      new FixedClock(),
    ).execute();

    expect(dashboard.evento).toBeNull();
    expect(dashboard.proximasReuniones).toEqual([]);
  });

  it('counts what is running and what comes next', async () => {
    const dashboard = await new GetStaffDashboardUseCase(
      new FakeEventReport(),
      new FakeMeetingReport({
        byState: { EN_CURSO: 2 },
        upcoming: 5,
        virtual: 1,
        agenda: [buildMeetingRow()],
      }),
      new FakeTableReport({ active: 6 }),
      new FakeActivityReport(),
      new FixedClock(),
    ).execute();

    expect(dashboard.totales).toEqual({
      reunionesEnCurso: 2,
      proximasReuniones: 5,
      reunionesVirtuales: 1,
      mesasActivas: 6,
    });
    expect(dashboard.proximasReuniones).toHaveLength(1);
  });
});

describe('GetCompanyDashboardUseCase', () => {
  it('tells the two directions of a pending request apart', async () => {
    const dashboard = await new GetCompanyDashboardUseCase(
      new FakeEventReport(),
      new FakeMeetingReport({ ofCompany: 4, awaiting: 1 }),
      new FakeRequestReport({ received: 3, sent: 2 }),
      new FakeNewsReport([
        { id: 1, titulo: 'Aviso', tipo: 'GENERAL', fecha: new Date('2026-09-19T12:00:00.000Z') },
      ]),
      new FakeActivityReport(),
      new FixedClock(),
    ).execute(COMPANY_EVENT_ID);

    expect(dashboard).toMatchObject({
      pendientesRecibidas: 3,
      pendientesEnviadas: 2,
      reunionesTotal: 4,
      pendientesEvaluar: 1,
      proximaReunion: null,
    });
    expect(dashboard.comunicados).toHaveLength(1);
  });
});

describe('GetEventStatisticsUseCase', () => {
  function statisticsOf(parts: {
    companies?: FakeCompanyReport;
    meetings?: FakeMeetingReport;
    attendance?: FakeAttendanceReport;
    event?: FakeEventReport;
  }) {
    const companies = parts.companies ?? new FakeCompanyReport();
    const meetings = parts.meetings ?? new FakeMeetingReport();
    const attendance = parts.attendance ?? new FakeAttendanceReport();

    return new GetEventStatisticsUseCase(
      parts.event ?? new FakeEventReport(),
      companies,
      meetings,
      new FakeTableReport({ active: 6, disabled: 1 }),
      new FakeActivityReport({ total: 3 }),
      attendance,
      new FixedClock(),
      new EventImpactReader(companies, meetings, attendance),
    );
  }

  it('answers empty while no event is running', async () => {
    const statistics = await statisticsOf({ event: new FakeEventReport(null) }).execute();

    expect(statistics.kpis).toEqual({});
    expect(statistics.mesas).toEqual([]);
  });

  it('derives the rates out of the counts it read', async () => {
    const statistics = await statisticsOf({
      companies: new FakeCompanyReport({
        enrollments: 10,
        participants: 40,
        byPaymentState: { COMPLETADO: 6, PENDIENTE: 3, OBSERVADO: 1 },
      }),
      meetings: new FakeMeetingReport({
        byState: { PROGRAMADA: 4, FINALIZADA: 6, EN_CURSO: 1, CANCELADA: 2, REPROGRAMADA: 1 },
      }),
    }).execute();

    expect(statistics.reunionesPorEstado).toEqual({
      programadas: 4,
      enCurso: 1,
      finalizadas: 6,
      canceladas: 2,
      reprogramadas: 1,
      total: 14,
    });
    expect(statistics.kpis.reunionesNoCanceladas).toBe(12);
    expect(statistics.kpis.tasaRealizacion).toBe(50);
    expect(statistics.pagosPorEstado.porcentajeVerificados).toBe(60);
  });

  it('never reports a negative number of absentees', async () => {
    const statistics = await statisticsOf({
      companies: new FakeCompanyReport({ enrollments: 1, participants: 0 }),
      attendance: new FakeAttendanceReport({
        impact: [
          {
            companyEventId: 1,
            membershipId: 100,
            fechaHoraAsistencia: new Date('2026-09-20T13:00:00.000Z'),
          },
        ],
      }),
    }).execute();

    expect(statistics.asistencia.personasSinAsistencia).toBe(0);
  });

  it('asks for the attendance of the day the venue is living', async () => {
    const attendance = new FakeAttendanceReport({ today: 9 });

    const statistics = await statisticsOf({ attendance }).execute();

    expect(statistics.kpis.asistentesHoy).toBe(9);
    // 15:00 UTC is 11:00 in Bolivia, so the day runs 04:00 UTC to 04:00 UTC.
    expect(attendance.days[0]).toEqual({
      start: new Date('2026-09-20T04:00:00.000Z'),
      end: new Date('2026-09-21T04:00:00.000Z'),
    });
  });
});

describe('ExportReportUseCase', () => {
  function exportOf(parts: { companies?: FakeCompanyReport; meetings?: FakeMeetingReport; event?: FakeEventReport }) {
    const companies = parts.companies ?? new FakeCompanyReport();
    const meetings = parts.meetings ?? new FakeMeetingReport();

    return new ExportReportUseCase(
      parts.event ?? new FakeEventReport(),
      companies,
      meetings,
      readerOf(companies, meetings),
    );
  }

  it('refuses a kind of report it cannot produce', async () => {
    await expect(exportOf({}).execute('inventado')).rejects.toBeInstanceOf(ValidationError);
  });

  it('answers with no rows while no event is running', async () => {
    const report = await exportOf({ event: new FakeEventReport(null) }).execute('empresas');

    expect(report).toEqual({ tipo: 'empresas', filas: [] });
  });

  it('exports the roster of the event', async () => {
    const report = await exportOf({
      companies: new FakeCompanyReport({
        roster: [
          {
            nombre: 'Acme',
            rubro: 'Turismo',
            ciudad: 'Trinidad',
            pais: 'Bolivia',
            participantes: 2,
            cuposPagados: 4,
            estadoPago: 'COMPLETADO',
            acceso: 'HABILITADO',
            fechaRegistro: new Date('2026-09-18T13:00:00.000Z'),
          },
        ],
      }),
    }).execute('empresas');

    expect(report.filas[0]).toMatchObject({ Empresa: 'Acme', FechaRegistro: '2026-09-18' });
  });

  it('exports the meetings of the event', async () => {
    const report = await exportOf({
      meetings: new FakeMeetingReport({ forExport: [buildMeetingRow()] }),
    }).execute('reuniones');

    expect(report.filas[0]).toMatchObject({ EmpresaSolicitante: 'Acme', Mesa: 5 });
  });

  it('exports the ranking out of the same impact the statistics read', async () => {
    const companies = new FakeCompanyReport({
      impact: [{ empresaEventoId: 1, nombre: 'Acme', codigo: 'RB-ACM-1', participantes: 2 }],
    });
    const meetings = new FakeMeetingReport({
      impact: [{ reunionId: 10, estadoReunion: 'FINALIZADA', solicitanteId: 1, receptoraId: 2 }],
    });

    const report = await exportOf({ companies, meetings }).execute('ranking');

    expect(report.filas[0]).toMatchObject({ Empresa: 'Acme', Reuniones: 1 });
  });
});

describe('SearchEventUseCase', () => {
  it('searches nothing when nothing was typed', async () => {
    const companies = new FakeCompanyReport();

    const found = await new SearchEventUseCase(
      new FakeEventReport(),
      companies,
      new FakeMeetingReport(),
      new FakeTableReport(),
    ).execute('   ');

    expect(found).toEqual({ empresas: [], reuniones: [], mesas: [] });
    expect(companies.searched).toEqual([]);
  });

  it('asks every owner for the same trimmed term', async () => {
    const companies = new FakeCompanyReport();

    await new SearchEventUseCase(
      new FakeEventReport(),
      companies,
      new FakeMeetingReport({ hits: [buildMeetingRow()] }),
      new FakeTableReport({ hits: [{ id: 3, numero: 5, activa: true }] }),
    ).execute('  acme ');

    expect(companies.searched).toEqual(['acme']);
  });
});
