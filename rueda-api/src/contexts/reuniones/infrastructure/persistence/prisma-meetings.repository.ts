import { Injectable } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  AutomatedMeeting,
  CompanyBrief,
  MeetingEvent,
  MeetingFilters,
  MeetingRecord,
  MeetingResultView,
  MeetingView,
  MeetingsRepositoryPort,
  NewMeeting,
  OwnMeetingView,
  RescheduleProposal,
  StatusChange,
} from '../../domain/ports/meetings.repository.port.js';
import type { Evaluation } from '../../domain/services/meeting-evaluation.js';

const EVENT_SELECT = {
  id: true,
  fechaInicioEvento: true,
  fechaFinEvento: true,
  fechaInicioSolicitudes: true,
  fechaFinSolicitudes: true,
  horariosReunionJson: true,
  duracionReunion: true,
  tiempoEntreReuniones: true,
} as const;

const COMPANY_SELECT = {
  empresa: {
    select: { id: true, codigo: true, nombre: true, rubro: true, urlFotoPerfil: true },
  },
} as const;

const PARTIES = {
  empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { select: COMPANY_SELECT },
  empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
    select: COMPANY_SELECT,
  },
} as const;

/** Both sides must still be enrolled and active for a meeting to be operative. */
const BOTH_PARTIES_ACTIVE = {
  empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
    estaActivo: 1,
    empresa: { estaActivo: 1 },
  },
  empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
    estaActivo: 1,
    empresa: { estaActivo: 1 },
  },
} as const;

const MEETING_INCLUDE = {
  mesa: { select: { id: true, numeroMesa: true } },
  solicitudreunion: { include: PARTIES },
  resultadoreunion: {
    where: { estaActivo: 1 },
    select: {
      id: true,
      empresaeventoCalificadora_id: true,
      calificacionReunion: true,
      rangoAcuerdoComercial: true,
      observacionesPuntosTratados: true,
    },
  },
} as const;

const LIVE_MEETING = { not: 'CANCELADA' };
/** A meeting that was agreed and has not started yet. */
const SCHEDULED = ['PROGRAMADA', 'REPROGRAMADA'];
/** Meetings that happen over a video call, whatever else they also are. */
const REMOTE_KINDS = ['VIRTUAL', 'MIXTA'];

/** What the automation needs to act on a meeting and to name both sides. */
const AUTOMATION_SELECT = {
  id: true,
  evento_id: true,
  fechaHoraInicioReunion: true,
  fechaHoraFinReunion: true,
  tipoReunion: true,
  estadoReunion: true,
  mesa: { select: { numeroMesa: true } },
  solicitudreunion: {
    select: {
      enlaceReunionVirtual: true,
      empresaEvento_id: true,
      empresaEventorReceptora_id: true,
      empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
        select: { empresa: { select: { nombre: true } } },
      },
      empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
        select: { empresa: { select: { nombre: true } } },
      },
    },
  },
} as const;
const MEETING_LOCK_NAMESPACE = 78422;
const LINK_ALERTS = [
  'staff:reunion-sin-enlace',
  'staff:reunion-sin-enlace-urgente',
  'staff:reunion-teams-responsable',
];

type Row = Record<string, any>;

function toEvent(row: Row): MeetingEvent {
  return {
    id: row.id,
    startsAt: row.fechaInicioEvento,
    endsAt: row.fechaFinEvento,
    registrationStartsAt: row.fechaInicioSolicitudes,
    registrationEndsAt: row.fechaFinSolicitudes,
    meetingHoursJson: row.horariosReunionJson,
    duracionReunion: row.duracionReunion,
    tiempoEntreReuniones: row.tiempoEntreReuniones,
  };
}

function toAutomated(row: Row): AutomatedMeeting {
  const request = row.solicitudreunion;

  return {
    id: row.id,
    eventId: row.evento_id,
    inicio: row.fechaHoraInicioReunion,
    fin: row.fechaHoraFinReunion,
    tipoReunion: row.tipoReunion,
    estadoReunion: row.estadoReunion,
    numeroMesa: row.mesa?.numeroMesa ?? null,
    enlace: request?.enlaceReunionVirtual ?? null,
    solicitanteId: request?.empresaEvento_id ?? null,
    receptoraId: request?.empresaEventorReceptora_id ?? null,
    solicitanteNombre:
      request?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa?.nombre ??
      null,
    receptoraNombre:
      request?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa
        ?.nombre ?? null,
  };
}

function companyOf(side: Row | null | undefined): CompanyBrief | null {
  const company = side?.empresa;
  return company
    ? {
        id: company.id,
        codigo: company.codigo ?? null,
        nombre: company.nombre,
        rubro: company.rubro ?? null,
        urlFotoPerfil: company.urlFotoPerfil ?? null,
      }
    : null;
}

function toRecord(row: Row): MeetingRecord {
  const request = row.solicitudreunion;
  const sender = request?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
  const receiver =
    request?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;

  return {
    id: row.id,
    requestId: row.solicitudReunion_id,
    eventId: row.evento_id,
    estadoReunion: row.estadoReunion,
    tipoReunion: row.tipoReunion,
    inicio: row.fechaHoraInicioReunion,
    fin: row.fechaHoraFinReunion,
    mesaId: row.mesa_id ?? null,
    enlaceReunionVirtual: request?.enlaceReunionVirtual ?? null,
    inicioAnticipadoPor: row.inicioAnticipadoPor ?? null,
    solicitanteId: request?.empresaEvento_id ?? 0,
    receptoraId: request?.empresaEventorReceptora_id ?? 0,
    solicitanteNombre: sender?.empresa?.nombre ?? null,
    receptoraNombre: receiver?.empresa?.nombre ?? null,
  };
}

function toView(row: Row): MeetingView {
  const request = row.solicitudreunion;

  return {
    id: row.id,
    tipo: row.tipoReunion,
    estado: row.estadoReunion,
    inicio: row.fechaHoraInicioReunion,
    fin: row.fechaHoraFinReunion,
    inicioReal: row.fechaHoraInicioReal ?? null,
    finReal: row.fechaHoraFinReal ?? null,
    observaciones: row.observacionesReunion ?? null,
    enlace: request?.enlaceReunionVirtual ?? null,
    mesa: row.mesa ? { id: row.mesa.id, numeroMesa: row.mesa.numeroMesa } : null,
    solicitante: companyOf(
      request?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento,
    ),
    receptora: companyOf(
      request?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento,
    ),
    resultados: row.resultadoreunion ?? [],
  };
}

function toProposal(row: Row): RescheduleProposal {
  return {
    id: row.id,
    reunionId: row.reunion_id,
    solicitadoPorEeId: row.solicitadoPorEe_id,
    tipoReunion: row.tipoReunion,
    inicio: row.fechaHoraInicio,
    fin: row.fechaHoraFin,
    mesaId: row.mesa_id ?? null,
    enlaceReunionVirtual: row.enlaceReunionVirtual ?? null,
    mensaje: row.mensaje ?? null,
    estado: row.estado,
  };
}

/** Free text search over the two company names, the table and the states. */
function matches(view: MeetingView, q: string): boolean {
  const needle = q.toLowerCase();
  return [
    view.solicitante?.nombre,
    view.receptora?.nombre,
    view.mesa ? String(view.mesa.numeroMesa) : null,
    view.estado,
    view.tipo,
  ].some((field) => field?.toLowerCase().includes(needle));
}

@Injectable()
export class PrismaMeetingsRepository implements MeetingsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEvent(): Promise<MeetingEvent | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: EVENT_SELECT,
    });
    return row ? toEvent(row) : null;
  }

  async findGrantedEnrollment(
    companyEventId: number,
    eventId: number,
  ): Promise<{ id: number } | null> {
    return this.prisma.empresaevento.findFirst({
      where: {
        id: companyEventId,
        evento_id: eventId,
        estaActivo: 1,
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
      },
      select: { id: true },
    });
  }

  async findResponsibleMembership(companyEventId: number): Promise<{ id: number } | null> {
    return this.prisma.empresa_usuario.findFirst({
      where: { empresaevento_id: companyEventId, esResponsable: 1, estaActivo: 1 },
      select: { id: true },
    });
  }

  async findAnyMembership(companyEventId: number): Promise<{ id: number } | null> {
    return this.prisma.empresa_usuario.findFirst({
      where: { empresaevento_id: companyEventId, estaActivo: 1 },
      orderBy: { esResponsable: 'desc' },
      select: { id: true },
    });
  }

  async findCompany(companyEventId: number, eventId: number): Promise<CompanyBrief | null> {
    const row = await this.prisma.empresaevento.findFirst({
      where: { id: companyEventId, evento_id: eventId, estaActivo: 1 },
      select: COMPANY_SELECT,
    });
    return companyOf(row);
  }

  async find(meetingId: number, eventId: number): Promise<MeetingRecord | null> {
    const row = await this.prisma.reunion.findFirst({
      where: { id: meetingId, evento_id: eventId, estaActivo: 1 },
      include: { solicitudreunion: { include: PARTIES } },
    });
    return row ? toRecord(row) : null;
  }

  async findView(meetingId: number, eventId: number): Promise<MeetingView | null> {
    const row = await this.prisma.reunion.findFirst({
      where: { id: meetingId, evento_id: eventId, estaActivo: 1 },
      include: MEETING_INCLUDE,
    });
    return row ? toView(row) : null;
  }

  async list(
    eventId: number,
    window: TimeWindow,
    filters: MeetingFilters,
  ): Promise<MeetingView[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...this.operativeFilter(eventId, window),
        ...(filters.estado && filters.estado !== 'TODOS'
          ? { estadoReunion: filters.estado }
          : {}),
        ...(filters.tipo && filters.tipo !== 'TODOS' ? { tipoReunion: filters.tipo } : {}),
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      include: MEETING_INCLUDE,
    });

    const views = rows.map(toView);
    const q = filters.q?.trim();
    return q ? views.filter((view) => matches(view, q)) : views;
  }

  async listFinished(
    eventId: number,
    window: TimeWindow,
    q?: string,
  ): Promise<MeetingView[]> {
    const rows = await this.prisma.reunion.findMany({
      where: { ...this.operativeFilter(eventId, window), estadoReunion: 'FINALIZADA' },
      orderBy: { fechaHoraFinReunion: 'desc' },
      include: MEETING_INCLUDE,
    });

    const views = rows.map(toView);
    const needle = q?.trim();
    return needle ? views.filter((view) => matches(view, needle)) : views;
  }

  async listOfCompanyForStaff(
    companyEventId: number,
    eventId: number,
  ): Promise<MeetingView[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        evento_id: eventId,
        estaActivo: 1,
        estadoReunion: LIVE_MEETING,
        solicitudreunion: {
          OR: [
            { empresaEvento_id: companyEventId },
            { empresaEventorReceptora_id: companyEventId },
          ],
        },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      include: MEETING_INCLUDE,
    });
    return rows.map(toView);
  }

  async listOf(companyEventId: number, window: TimeWindow): Promise<OwnMeetingView[]> {
    const now = new Date();
    const rows = await this.prisma.reunion.findMany({
      where: {
        estaActivo: 1,
        estadoReunion: LIVE_MEETING,
        fechaHoraInicioReunion: { gte: window.start },
        fechaHoraFinReunion: { lte: window.end },
        solicitudreunion: {
          estaActivo: 1,
          OR: [
            { empresaEvento_id: companyEventId },
            { empresaEventorReceptora_id: companyEventId },
          ],
        },
      },
      include: {
        ...MEETING_INCLUDE,
        resultadoreunion: {
          where: { estaActivo: 1, empresaeventoCalificadora_id: companyEventId },
          select: { id: true, calificacionReunion: true, rangoAcuerdoComercial: true },
        },
        cambioreunion: {
          where: { estaActivo: 1, estado: 'PENDIENTE' },
          orderBy: { fechaCreacion: 'desc' },
          take: 1,
        },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
    });

    const views = rows.map((row) => {
      const request = row.solicitudreunion;
      const yoSolicite = request.empresaEvento_id === companyEventId;
      const counterpart = yoSolicite
        ? request.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento
        : request.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;

      return {
        id: row.id,
        tipo: row.tipoReunion,
        estado: row.estadoReunion,
        inicio: row.fechaHoraInicioReunion,
        fin: row.fechaHoraFinReunion,
        mesa: row.mesa ? { id: row.mesa.id, numeroMesa: row.mesa.numeroMesa } : null,
        // The link is only handed out once the meeting is actually running.
        enlace:
          row.estadoReunion === 'EN_CURSO' && row.fechaHoraInicioReunion <= now
            ? (request.enlaceReunionVirtual ?? null)
            : null,
        enlaceConfigurado: Boolean(request.enlaceReunionVirtual),
        mensaje: request.mensajeParaEmpresaReceptora ?? null,
        contraparte: companyOf(counterpart),
        miResultado: row.resultadoreunion[0] ?? null,
        solicitanteEeId: request.empresaEvento_id,
        receptoraEeId: request.empresaEventorReceptora_id,
        yoSolicite,
        cambioPendiente: row.cambioreunion[0] ? toProposal(row.cambioreunion[0]) : null,
        inicioAnticipadoPor: row.inicioAnticipadoPor ?? null,
      };
    });

    // The ones the company asked for come first: they are the ones it is
    // waiting on. Inside each group the day runs in order.
    return views.sort((left, right) => {
      if (left.yoSolicite !== right.yoSolicite) return left.yoSolicite ? -1 : 1;
      return left.inicio.getTime() - right.inicio.getTime();
    });
  }

  async listEligibleCompanies(eventId: number): Promise<CompanyBrief[]> {
    const rows = await this.prisma.empresaevento.findMany({
      where: {
        evento_id: eventId,
        estaActivo: 1,
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
        empresa: { estaActivo: 1 },
      },
      select: { id: true, ...COMPANY_SELECT },
      orderBy: { empresa: { nombre: 'asc' } },
    });

    // The id companies are addressed by here is the enrollment, not the company.
    return rows.map((row) => ({ ...companyOf(row)!, id: row.id }));
  }

  async listIdleCompanies(eventId: number): Promise<CompanyBrief[]> {
    const [enrolled, busy] = await Promise.all([
      this.listEligibleCompanies(eventId),
      this.prisma.reunion.findMany({
        where: { evento_id: eventId, estaActivo: 1, estadoReunion: 'EN_CURSO' },
        select: {
          solicitudreunion: {
            select: { empresaEvento_id: true, empresaEventorReceptora_id: true },
          },
        },
      }),
    ]);

    const meeting = new Set<number>();
    for (const row of busy) {
      meeting.add(row.solicitudreunion.empresaEvento_id);
      meeting.add(row.solicitudreunion.empresaEventorReceptora_id);
    }

    return enrolled.filter((company) => !meeting.has(company.id));
  }

  async createMeeting(meeting: NewMeeting): Promise<{ meetingId: number }> {
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockTable(tx, meeting.mesaId, meeting.window, null);

        // A booking made by the event team is born already agreed, so its
        // request is created accepted rather than waiting for an answer.
        const request = await tx.solicitudreunion.create({
          data: {
            empresaEvento_id: meeting.solicitanteId,
            empresaEventorReceptora_id: meeting.receptoraId,
            empresa_usuarioResponsableSolicitud: meeting.companyUserId,
            tipoReunion: meeting.tipoReunion,
            enlaceReunionVirtual: meeting.enlaceReunionVirtual,
            fechaHoraInicioPropuesta: meeting.window.start,
            fechaHoraFinPropuesta: meeting.window.end,
            mensajeParaEmpresaReceptora: meeting.mensaje,
            estadoSolicitud: 'ACEPTADA',
            mesa_id: meeting.mesaId,
            estaActivo: 1,
          },
        });

        const created = await tx.reunion.create({
          data: {
            solicitudReunion_id: request.id,
            mesa_id: meeting.mesaId,
            evento_id: meeting.eventId,
            tipoReunion: meeting.tipoReunion,
            fechaHoraInicioReunion: meeting.window.start,
            fechaHoraFinReunion: meeting.window.end,
            estadoReunion: 'PROGRAMADA',
            seEnvioNotificacionDeRetraso: 0,
            cantidadAsistentesRegistrados: 0,
            estaActivo: 1,
          },
        });

        return { meetingId: created.id };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async changeStatus(meetingId: number, change: StatusChange): Promise<void> {
    await this.prisma.reunion.update({
      where: { id: meetingId },
      data: {
        estadoReunion: change.estadoReunion,
        creadoModificadoFecha: new Date(),
        ...(change.observaciones === undefined
          ? {}
          : { observacionesReunion: change.observaciones }),
        ...(change.asistentes === undefined
          ? {}
          : { cantidadAsistentesRegistrados: change.asistentes }),
        ...(change.finReal ? { fechaHoraFinReal: change.finReal } : {}),
      },
    });
  }

  async cancelMeeting(meetingId: number, observaciones: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.reunion.update({
        where: { id: meetingId },
        data: {
          estadoReunion: 'CANCELADA',
          observacionesReunion: observaciones,
          creadoModificadoFecha: new Date(),
        },
      });

      await tx.solicitudreunion.update({
        where: { id: meeting.solicitudReunion_id },
        data: { estadoSolicitud: 'CANCELADA', creadoModificadoFecha: new Date() },
      });

      // The table it held goes back to the floor.
      await tx.mesabloque.updateMany({
        where: { reunion_id: meetingId, estaActivo: 1 },
        data: { estaOcupado: 0, estaActivo: 0, creadoModificadoFecha: new Date() },
      });
    });
  }

  async startMeeting(meetingId: number, startedAt: Date): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        // Both companies may press at the same instant; only one start counts.
        await tx.$queryRaw`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(${MEETING_LOCK_NAMESPACE}, ${meetingId})) AS lock_row`;

        const current = await tx.reunion.findFirst({
          where: {
            id: meetingId,
            estaActivo: 1,
            estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA'] },
          },
          select: { id: true },
        });
        if (!current) {
          throw new ConflictError('La reunión ya fue iniciada o ya no está disponible.');
        }

        await tx.reunion.update({
          where: { id: meetingId },
          data: {
            estadoReunion: 'EN_CURSO',
            inicioAnticipadoPor: null,
            fechaHoraInicioReal: startedAt,
            creadoModificadoFecha: startedAt,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async markEarlyStartRequest(meetingId: number, companyEventId: number): Promise<void> {
    await this.prisma.reunion.update({
      where: { id: meetingId },
      data: { inicioAnticipadoPor: companyEventId, creadoModificadoFecha: new Date() },
    });
  }

  async setLink(requestId: number, meetingId: number, enlace: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.solicitudreunion.update({
        where: { id: requestId },
        data: { enlaceReunionVirtual: enlace, creadoModificadoFecha: new Date() },
      });

      // The alerts that asked for this link have been answered.
      await tx.notificacionstaff.updateMany({
        where: {
          referenciaId: meetingId,
          tipoNotificacion: { in: LINK_ALERTS },
          estaActivo: 1,
        },
        data: { estaActivo: 0 },
      });
    });
  }

  async saveEvaluations(
    meetingId: number,
    finishedAt: Date,
    evaluations: {
      calificadora: number;
      calificada: number;
      autor: number;
      evaluation: Evaluation;
    }[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.reunion.update({
        where: { id: meetingId },
        data: {
          estadoReunion: 'FINALIZADA',
          fechaHoraFinReal: finishedAt,
          creadoModificadoFecha: finishedAt,
        },
      });

      for (const entry of evaluations) {
        // A company that already filled in its own result keeps it.
        const existing = await tx.resultadoreunion.findFirst({
          where: {
            reunion_id: meetingId,
            empresaeventoCalificadora_id: entry.calificadora,
            estaActivo: 1,
          },
          select: { id: true },
        });
        if (existing) continue;

        await tx.resultadoreunion.create({
          data: {
            reunion_id: meetingId,
            empresaeventoCalificadora_id: entry.calificadora,
            empresaeventoCalificada_id: entry.calificada,
            empresa_usuario_id: entry.autor,
            calificacionReunion: entry.evaluation.calificacionReunion,
            rangoAcuerdoComercial: entry.evaluation.rangoAcuerdoComercial,
            observacionesPuntosTratados: entry.evaluation.observacionesPuntosTratados,
            estaActivo: 1,
          },
        });
      }
    });
  }

  async countReschedules(meetingId: number): Promise<number> {
    return this.prisma.cambioreunion.count({
      where: { reunion_id: meetingId, estaActivo: 1 },
    });
  }

  async findPendingReschedule(meetingId: number): Promise<RescheduleProposal | null> {
    const row = await this.prisma.cambioreunion.findFirst({
      where: { reunion_id: meetingId, estado: 'PENDIENTE', estaActivo: 1 },
    });
    return row ? toProposal(row) : null;
  }

  async findReschedule(
    changeId: number,
  ): Promise<(RescheduleProposal & { meeting: MeetingRecord }) | null> {
    const row = await this.prisma.cambioreunion.findFirst({
      where: { id: changeId, estaActivo: 1 },
      include: { reunion: { include: { solicitudreunion: { include: PARTIES } } } },
    });
    if (!row) return null;

    return { ...toProposal(row), meeting: toRecord(row.reunion) };
  }

  async createReschedule(
    proposal: Omit<RescheduleProposal, 'id' | 'estado'>,
  ): Promise<RescheduleProposal> {
    const row = await this.prisma.cambioreunion.create({
      data: {
        reunion_id: proposal.reunionId,
        solicitadoPorEe_id: proposal.solicitadoPorEeId,
        tipoReunion: proposal.tipoReunion,
        fechaHoraInicio: proposal.inicio,
        fechaHoraFin: proposal.fin,
        mesa_id: proposal.mesaId,
        enlaceReunionVirtual: proposal.enlaceReunionVirtual,
        mensaje: proposal.mensaje,
        estado: 'PENDIENTE',
      },
    });
    return toProposal(row);
  }

  async rejectReschedule(changeId: number, motivo: string | null): Promise<void> {
    await this.prisma.cambioreunion.update({
      where: { id: changeId },
      data: { estado: 'RECHAZADA', motivoRechazo: motivo, creadoModificadoFecha: new Date() },
    });
  }

  async applyReschedule(changeId: number): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const change = await tx.cambioreunion.findFirst({
          where: { id: changeId, estado: 'PENDIENTE', estaActivo: 1 },
          include: { reunion: true },
        });
        if (!change) throw new ConflictError('La propuesta ya no está pendiente');

        const mesaId =
          change.tipoReunion === 'PRESENCIAL'
            ? (change.mesa_id ?? change.reunion.mesa_id)
            : null;
        const window = { start: change.fechaHoraInicio, end: change.fechaHoraFin };
        await this.lockTable(tx, mesaId, window, change.reunion_id);

        // The old block is released and a new one taken, so the floor always
        // reflects where the meeting actually is.
        await tx.mesabloque.updateMany({
          where: { reunion_id: change.reunion_id, estaActivo: 1 },
          data: { estaOcupado: 0, estaActivo: 0, creadoModificadoFecha: new Date() },
        });
        if (mesaId) {
          await tx.mesabloque.create({
            data: {
              mesa_id: mesaId,
              reunion_id: change.reunion_id,
              fechaHoraInicio: window.start,
              fechaHoraFin: window.end,
              estaOcupado: 1,
              estaActivo: 1,
            },
          });
        }

        await tx.reunion.update({
          where: { id: change.reunion_id },
          data: {
            tipoReunion: change.tipoReunion,
            mesa_id: mesaId,
            fechaHoraInicioReunion: window.start,
            fechaHoraFinReunion: window.end,
            estadoReunion: 'REPROGRAMADA',
            seEnvioNotificacionDeRetraso: 0,
            creadoModificadoFecha: new Date(),
          },
        });

        await tx.solicitudreunion.update({
          where: { id: change.reunion.solicitudReunion_id },
          data: {
            tipoReunion: change.tipoReunion,
            mesa_id: mesaId,
            fechaHoraInicioPropuesta: window.start,
            fechaHoraFinPropuesta: window.end,
            enlaceReunionVirtual: change.enlaceReunionVirtual,
            mensajeParaEmpresaReceptora: change.mensaje,
            creadoModificadoFecha: new Date(),
          },
        });

        await tx.cambioreunion.update({
          where: { id: changeId },
          data: { estado: 'ACEPTADA', creadoModificadoFecha: new Date() },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async findCompanyContact(
    companyEventId: number,
  ): Promise<{ nombres: string; correo: string } | null> {
    const row = await this.prisma.empresa_usuario.findFirst({
      where: { empresaevento_id: companyEventId, estaActivo: 1 },
      orderBy: { esResponsable: 'desc' },
      select: { usuario: { select: { nombres: true, correo: true } } },
    });
    return row?.usuario ? { nombres: row.usuario.nombres, correo: row.usuario.correo } : null;
  }

  async findOwnResult(
    meetingId: number,
    companyEventId: number,
  ): Promise<{ id: number } | null> {
    return this.prisma.resultadoreunion.findFirst({
      where: {
        reunion_id: meetingId,
        empresaeventoCalificadora_id: companyEventId,
        estaActivo: 1,
      },
      select: { id: true },
    });
  }

  async findMembership(
    companyUserId: number,
    companyEventId: number,
  ): Promise<{ id: number } | null> {
    return this.prisma.empresa_usuario.findFirst({
      where: { id: companyUserId, empresaevento_id: companyEventId, estaActivo: 1 },
      select: { id: true },
    });
  }

  async saveOwnResult(result: {
    meetingId: number;
    calificadora: number;
    calificada: number;
    autor: number;
    evaluation: Evaluation;
  }): Promise<{ id: number }> {
    const row = await this.prisma.resultadoreunion.create({
      data: {
        reunion_id: result.meetingId,
        empresaeventoCalificadora_id: result.calificadora,
        empresaeventoCalificada_id: result.calificada,
        empresa_usuario_id: result.autor,
        calificacionReunion: result.evaluation.calificacionReunion,
        rangoAcuerdoComercial: result.evaluation.rangoAcuerdoComercial,
        observacionesPuntosTratados: result.evaluation.observacionesPuntosTratados,
        estaActivo: 1,
      },
      select: { id: true },
    });
    return row;
  }

  async listResultsOf(companyEventId: number): Promise<MeetingResultView[]> {
    const rows = await this.prisma.resultadoreunion.findMany({
      where: { empresaeventoCalificadora_id: companyEventId, estaActivo: 1 },
      include: {
        reunion: {
          select: {
            id: true,
            fechaHoraInicioReunion: true,
            fechaHoraFinReunion: true,
            tipoReunion: true,
            estadoReunion: true,
            mesa: { select: { numeroMesa: true } },
          },
        },
        empresaevento_resultadoreunion_empresaeventoCalificada_idToempresaevento: {
          select: { empresa: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    return rows.map((row) => {
      const other =
        row.empresaevento_resultadoreunion_empresaeventoCalificada_idToempresaevento?.empresa;

      return {
        id: row.id,
        calificacionReunion: row.calificacionReunion,
        rangoAcuerdoComercial: row.rangoAcuerdoComercial,
        observacionesPuntosTratados: row.observacionesPuntosTratados,
        fechaCreacion: row.fechaCreacion,
        contraparte: other ? { id: other.id, nombre: other.nombre } : null,
        reunion: {
          id: row.reunion.id,
          inicio: row.reunion.fechaHoraInicioReunion,
          fin: row.reunion.fechaHoraFinReunion,
          tipo: row.reunion.tipoReunion,
          estado: row.reunion.estadoReunion,
          numeroMesa: row.reunion.mesa?.numeroMesa ?? null,
        },
      };
    });
  }

  // What the event does on its own. Every query below is scoped to the
  // operative window, so a historical row is never started or closed again.

  async listPendingReminders(
    eventId: number,
    window: TimeWindow,
    until: Date,
  ): Promise<AutomatedMeeting[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...this.operativeFilter(eventId, window),
        estadoReunion: { in: SCHEDULED },
        seEnvioNotificacionDeRetraso: 0,
        fechaHoraInicioReunion: { gte: window.start, lte: until },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      select: AUTOMATION_SELECT,
    });

    return rows.map(toAutomated);
  }

  async markReminderSent(meetingId: number): Promise<void> {
    await this.prisma.reunion.update({
      where: { id: meetingId },
      data: { seEnvioNotificacionDeRetraso: 1 },
    });
  }

  async listDueToStart(
    eventId: number,
    window: TimeWindow,
    now: Date,
  ): Promise<AutomatedMeeting[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...this.operativeFilter(eventId, window),
        estadoReunion: { in: SCHEDULED },
        fechaHoraInicioReunion: { lte: now },
        fechaHoraFinReunion: { gt: now },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      select: AUTOMATION_SELECT,
    });

    return rows.map(toAutomated);
  }

  async listEndingSoon(
    eventId: number,
    window: TimeWindow,
    now: Date,
    until: Date,
  ): Promise<AutomatedMeeting[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...this.operativeFilter(eventId, window),
        estadoReunion: 'EN_CURSO',
        fechaHoraFinReunion: { gt: now, lte: until },
      },
      orderBy: { fechaHoraFinReunion: 'asc' },
      select: AUTOMATION_SELECT,
    });

    return rows.map(toAutomated);
  }

  async listOverdue(eventId: number, window: TimeWindow, now: Date): Promise<AutomatedMeeting[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...this.operativeFilter(eventId, window),
        estadoReunion: { in: [...SCHEDULED, 'EN_CURSO'] },
        fechaHoraFinReunion: { lte: now },
      },
      orderBy: { fechaHoraFinReunion: 'asc' },
      select: AUTOMATION_SELECT,
    });

    return rows.map(toAutomated);
  }

  async listRemoteWithoutLink(
    eventId: number,
    window: TimeWindow,
    now: Date,
  ): Promise<AutomatedMeeting[]> {
    return this.remoteWithoutLink(eventId, window, { fechaHoraFinReunion: { gt: now } });
  }

  async listRemoteWithoutLinkStartingBefore(
    eventId: number,
    window: TimeWindow,
    now: Date,
    until: Date,
  ): Promise<AutomatedMeeting[]> {
    return this.remoteWithoutLink(eventId, window, {
      fechaHoraInicioReunion: { gt: now, lte: until },
    });
  }

  async listTeamsStartingBefore(
    eventId: number,
    window: TimeWindow,
    now: Date,
    until: Date,
  ): Promise<AutomatedMeeting[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...this.operativeFilter(eventId, window),
        estadoReunion: { in: SCHEDULED },
        tipoReunion: { in: REMOTE_KINDS },
        fechaHoraInicioReunion: { gt: now, lte: until },
        solicitudreunion: {
          ...BOTH_PARTIES_ACTIVE,
          enlaceReunionVirtual: { contains: 'teams', mode: 'insensitive' },
        },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      select: AUTOMATION_SELECT,
    });

    return rows.map(toAutomated);
  }

  private async remoteWithoutLink(
    eventId: number,
    window: TimeWindow,
    when: Record<string, unknown>,
  ): Promise<AutomatedMeeting[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        ...this.operativeFilter(eventId, window),
        estadoReunion: { in: SCHEDULED },
        tipoReunion: { in: REMOTE_KINDS },
        ...when,
        solicitudreunion: {
          ...BOTH_PARTIES_ACTIVE,
          OR: [{ enlaceReunionVirtual: null }, { enlaceReunionVirtual: '' }],
        },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
      select: AUTOMATION_SELECT,
    });

    return rows.map(toAutomated);
  }

  /** A meeting is operative while it sits in the window and both sides stand. */
  private operativeFilter(eventId: number, window: TimeWindow) {
    return {
      evento_id: eventId,
      estaActivo: 1,
      fechaHoraInicioReunion: { gte: window.start },
      fechaHoraFinReunion: { lte: window.end },
      solicitudreunion: BOTH_PARTIES_ACTIVE,
    };
  }

  /** Serialises everything that wants one table and re-checks it inside the lock. */
  private async lockTable(
    tx: Record<string, any>,
    mesaId: number | null,
    window: TimeWindow,
    exceptMeetingId: number | null,
  ): Promise<void> {
    if (!mesaId) return;

    await tx.$queryRaw`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(78421, ${mesaId})) AS lock_row`;

    const [meeting, request] = await Promise.all([
      tx.reunion.findFirst({
        where: {
          ...(exceptMeetingId ? { id: { not: exceptMeetingId } } : {}),
          mesa_id: mesaId,
          estaActivo: 1,
          estadoReunion: LIVE_MEETING,
          fechaHoraInicioReunion: { lt: window.end },
          fechaHoraFinReunion: { gt: window.start },
        },
        select: { id: true },
      }),
      tx.solicitudreunion.findFirst({
        where: {
          mesa_id: mesaId,
          estaActivo: 1,
          estadoSolicitud: 'PENDIENTE',
          tipoReunion: 'PRESENCIAL',
          fechaHoraInicioPropuesta: { lt: window.end },
          fechaHoraFinPropuesta: { gt: window.start },
        },
        select: { id: true },
      }),
    ]);

    if (meeting || request) {
      throw new ConflictError('La mesa seleccionada acaba de ser reservada. Elige otra mesa.');
    }
  }
}
