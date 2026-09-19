import { Injectable } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import { meetingWindow } from '../../../eventos/domain/services/event-schedule.js';
import type { MeetingReportPort } from '../../../reportes/application/ports/meeting-report.port.js';
import type {
  CompanyNextMeeting,
  MeetingRow,
  ResultRow,
} from '../../../reportes/domain/models/report-views.js';
import type {
  ImpactMeeting,
  ImpactResult,
} from '../../../reportes/domain/services/event-impact.js';

const BOTH_SIDES_ACTIVE = {
  empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
    estaActivo: 1,
    empresa: { estaActivo: 1 },
  },
  empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
    estaActivo: 1,
    empresa: { estaActivo: 1 },
  },
} as const;

const SIDES = {
  solicitudreunion: {
    select: {
      enlaceReunionVirtual: true,
      empresaEvento_id: true,
      empresaEventorReceptora_id: true,
      empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
        select: { id: true, empresa: { select: { nombre: true } } },
      },
      empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
        select: { id: true, empresa: { select: { nombre: true } } },
      },
    },
  },
  mesa: { select: { numeroMesa: true } },
} as const;

function toRow(row: Record<string, any>): MeetingRow {
  const request = row.solicitudreunion;

  return {
    id: row.id,
    inicio: row.fechaHoraInicioReunion,
    fin: row.fechaHoraFinReunion,
    tipoReunion: row.tipoReunion,
    estadoReunion: row.estadoReunion,
    numeroMesa: row.mesa?.numeroMesa ?? null,
    solicitante:
      request?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa?.nombre ??
      null,
    receptora:
      request?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa
        ?.nombre ?? null,
  };
}

/**
 * Everything the reports say about meetings. It lives here because this context
 * owns what an operational meeting is: inside the window of the event, with
 * both enrollments still active. Historical rows stay in the database, but no
 * report may count them as current.
 */
@Injectable()
export class ReportsMeetingAdapter implements MeetingReportPort {
  constructor(private readonly prisma: PrismaService) {}

  private async operational(eventId: number): Promise<Record<string, unknown>> {
    const window = await this.windowOf(eventId);

    return {
      evento_id: eventId,
      estaActivo: 1,
      fechaHoraInicioReunion: { gte: window.start },
      fechaHoraFinReunion: { lte: window.end },
      solicitudreunion: BOTH_SIDES_ACTIVE,
    };
  }

  private async windowOf(eventId: number): Promise<TimeWindow> {
    const event = await this.prisma.evento.findUnique({ where: { id: eventId } });
    if (!event) return { start: new Date(0), end: new Date(0) };

    return meetingWindow({
      startsAt: event.fechaInicioEvento,
      endsAt: event.fechaFinEvento,
      registrationStartsAt: event.fechaInicioSolicitudes,
      registrationEndsAt: event.fechaFinSolicitudes,
      meetingHoursJson: event.horariosReunionJson,
    });
  }

  private ofCompany(companyEventId: number) {
    return {
      OR: [
        { empresaEvento_id: companyEventId },
        { empresaEventorReceptora_id: companyEventId },
      ],
    };
  }

  async countByState(eventId: number, estado: string): Promise<number> {
    return this.prisma.reunion.count({
      where: { ...(await this.operational(eventId)), estadoReunion: estado },
    });
  }

  async countAll(eventId: number): Promise<number> {
    return this.prisma.reunion.count({ where: await this.operational(eventId) });
  }

  async countVirtual(eventId: number): Promise<number> {
    return this.prisma.reunion.count({
      where: {
        ...(await this.operational(eventId)),
        tipoReunion: { in: ['VIRTUAL', 'MIXTA'] },
        estadoReunion: { not: 'CANCELADA' },
      },
    });
  }

  async countUpcoming(eventId: number, now: Date): Promise<number> {
    return this.prisma.reunion.count({
      where: {
        ...(await this.operational(eventId)),
        estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA'] },
        fechaHoraInicioReunion: { gte: now },
      },
    });
  }

  async listUpcoming(eventId: number, now: Date, limit: number): Promise<MeetingRow[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...(await this.operational(eventId)),
        estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'] },
        fechaHoraInicioReunion: { gte: now },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      take: limit,
      select: { id: true, fechaHoraInicioReunion: true, fechaHoraFinReunion: true, tipoReunion: true, estadoReunion: true, ...SIDES },
    });

    return rows.map(toRow);
  }

  async listForExport(eventId: number): Promise<MeetingRow[]> {
    const rows = await this.prisma.reunion.findMany({
      where: await this.operational(eventId),
      orderBy: { fechaHoraInicioReunion: 'asc' },
      select: { id: true, fechaHoraInicioReunion: true, fechaHoraFinReunion: true, tipoReunion: true, estadoReunion: true, ...SIDES },
    });

    return rows.map(toRow);
  }

  async listResultsForExport(eventId: number): Promise<ResultRow[]> {
    const rows = await this.prisma.resultadoreunion.findMany({
      where: { estaActivo: 1, reunion: await this.operational(eventId) },
      orderBy: { fechaCreacion: 'desc' },
      select: {
        calificacionReunion: true,
        rangoAcuerdoComercial: true,
        observacionesPuntosTratados: true,
        reunion: {
          select: { fechaHoraInicioReunion: true, mesa: { select: { numeroMesa: true } } },
        },
        empresaevento_resultadoreunion_empresaeventoCalificadora_idToempresaevento: {
          select: { empresa: { select: { nombre: true } } },
        },
        empresaevento_resultadoreunion_empresaeventoCalificada_idToempresaevento: {
          select: { empresa: { select: { nombre: true } } },
        },
        empresa_usuario: {
          select: { usuario: { select: { nombres: true, apellidoPaterno: true } } },
        },
      },
    });

    return rows.map((row) => {
      const author = row.empresa_usuario?.usuario;

      return {
        fechaReunion: row.reunion?.fechaHoraInicioReunion ?? null,
        numeroMesa: row.reunion?.mesa?.numeroMesa ?? null,
        empresaCalificadora:
          row.empresaevento_resultadoreunion_empresaeventoCalificadora_idToempresaevento?.empresa
            ?.nombre ?? null,
        empresaCalificada:
          row.empresaevento_resultadoreunion_empresaeventoCalificada_idToempresaevento?.empresa
            ?.nombre ?? null,
        calificacion: row.calificacionReunion,
        rangoAcuerdo: row.rangoAcuerdoComercial,
        observaciones: row.observacionesPuntosTratados,
        registradoPor: author ? `${author.nombres} ${author.apellidoPaterno}` : null,
      };
    });
  }

  async search(eventId: number, term: string): Promise<MeetingRow[]> {
    const byNumber = Number.parseInt(term, 10);
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...(await this.operational(eventId)),
        OR: [
          {
            solicitudreunion: {
              empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
                empresa: { nombre: { contains: term, mode: 'insensitive' } },
              },
            },
          },
          {
            solicitudreunion: {
              empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
                empresa: { nombre: { contains: term, mode: 'insensitive' } },
              },
            },
          },
          ...(Number.isNaN(byNumber) ? [] : [{ mesa: { numeroMesa: byNumber } }]),
        ],
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      take: 50,
      select: { id: true, fechaHoraInicioReunion: true, fechaHoraFinReunion: true, tipoReunion: true, estadoReunion: true, ...SIDES },
    });

    return rows.map(toRow);
  }

  async listForImpact(eventId: number): Promise<ImpactMeeting[]> {
    const rows = await this.prisma.reunion.findMany({
      where: { ...(await this.operational(eventId)), estadoReunion: { not: 'CANCELADA' } },
      select: {
        id: true,
        estadoReunion: true,
        solicitudreunion: {
          select: { empresaEvento_id: true, empresaEventorReceptora_id: true },
        },
      },
    });

    return rows.map((row) => ({
      reunionId: row.id,
      estadoReunion: row.estadoReunion,
      solicitanteId: row.solicitudreunion?.empresaEvento_id ?? null,
      receptoraId: row.solicitudreunion?.empresaEventorReceptora_id ?? null,
    }));
  }

  async listResultsForImpact(eventId: number): Promise<ImpactResult[]> {
    const rows = await this.prisma.resultadoreunion.findMany({
      where: { estaActivo: 1, reunion: await this.operational(eventId) },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        reunion_id: true,
        empresaeventoCalificadora_id: true,
        calificacionReunion: true,
        rangoAcuerdoComercial: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      reunionId: row.reunion_id,
      calificadoraId: row.empresaeventoCalificadora_id,
      calificacionReunion: row.calificacionReunion,
      rangoAcuerdoComercial: row.rangoAcuerdoComercial,
    }));
  }

  async countOfCompany(eventId: number, companyEventId: number): Promise<number> {
    return this.prisma.reunion.count({
      where: {
        ...(await this.operational(eventId)),
        estadoReunion: { not: 'CANCELADA' },
        solicitudreunion: { ...BOTH_SIDES_ACTIVE, ...this.ofCompany(companyEventId) },
      },
    });
  }

  async countAwaitingOutcome(eventId: number, companyEventId: number): Promise<number> {
    return this.prisma.reunion.count({
      where: {
        ...(await this.operational(eventId)),
        estadoReunion: 'FINALIZADA',
        solicitudreunion: { ...BOTH_SIDES_ACTIVE, ...this.ofCompany(companyEventId) },
        resultadoreunion: {
          none: { empresaeventoCalificadora_id: companyEventId, estaActivo: 1 },
        },
      },
    });
  }

  async findNextOfCompany(
    eventId: number,
    companyEventId: number,
    now: Date,
  ): Promise<CompanyNextMeeting | null> {
    const row = await this.prisma.reunion.findFirst({
      where: {
        ...(await this.operational(eventId)),
        estadoReunion: { notIn: ['CANCELADA', 'FINALIZADA'] },
        fechaHoraInicioReunion: { gte: now },
        solicitudreunion: { ...BOTH_SIDES_ACTIVE, ...this.ofCompany(companyEventId) },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      select: { id: true, fechaHoraInicioReunion: true, fechaHoraFinReunion: true, tipoReunion: true, estadoReunion: true, ...SIDES },
    });
    if (!row) return null;

    const request = row.solicitudreunion;
    const asking = request?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
    const receiving = request?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
    const counterpart = asking?.id === companyEventId ? receiving : asking;

    return {
      id: row.id,
      inicio: row.fechaHoraInicioReunion,
      fin: row.fechaHoraFinReunion,
      tipo: row.tipoReunion,
      estado: row.estadoReunion,
      numeroMesa: row.mesa?.numeroMesa ?? null,
      contraparte: counterpart?.empresa?.nombre ?? null,
      enlace: request?.enlaceReunionVirtual ?? null,
    };
  }
}
