import { Injectable } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  EditedMeetingRequest,
  MeetingRequestRecord,
  MeetingRequestView,
  MeetingRequestsRepositoryPort,
  NewMeetingRequest,
  RequestEvent,
} from '../../domain/ports/meeting-requests.repository.port.js';

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

const LIVE_MEETING = { not: 'CANCELADA' };
/** Namespace of the advisory lock that serialises bookings of one table. */
const TABLE_LOCK_NAMESPACE = 78421;

type Row = Record<string, any>;

function toEvent(row: Row): RequestEvent {
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

function toRecord(row: Row): MeetingRequestRecord {
  return {
    id: row.id,
    solicitanteId: row.empresaEvento_id,
    receptoraId: row.empresaEventorReceptora_id,
    estadoSolicitud: row.estadoSolicitud,
    tipoReunion: row.tipoReunion,
    inicio: row.fechaHoraInicioPropuesta,
    fin: row.fechaHoraFinPropuesta,
    mesaId: row.mesa_id ?? null,
    enlaceReunionVirtual: row.enlaceReunionVirtual ?? null,
  };
}

function companyOf(side: Row | null | undefined) {
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

@Injectable()
export class PrismaMeetingRequestsRepository implements MeetingRequestsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEvent(): Promise<RequestEvent | null> {
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

  async findMembership(
    companyUserId: number,
    companyEventId: number,
  ): Promise<{ id: number } | null> {
    return this.prisma.empresa_usuario.findFirst({
      where: { id: companyUserId, empresaevento_id: companyEventId, estaActivo: 1 },
      select: { id: true },
    });
  }

  async find(requestId: number): Promise<MeetingRequestRecord | null> {
    const row = await this.prisma.solicitudreunion.findFirst({
      where: { id: requestId, estaActivo: 1 },
    });
    return row ? toRecord(row) : null;
  }

  async findDuplicate(
    solicitanteId: number,
    receptoraId: number,
    start: Date,
  ): Promise<{ id: number } | null> {
    return this.prisma.solicitudreunion.findFirst({
      where: {
        estaActivo: 1,
        // A request that was turned down or withdrawn is not in the way.
        estadoSolicitud: { notIn: ['RECHAZADA', 'CANCELADA'] },
        fechaHoraInicioPropuesta: start,
        empresaEvento_id: solicitanteId,
        empresaEventorReceptora_id: receptoraId,
      },
      select: { id: true },
    });
  }

  async listFor(companyEventId: number, window: TimeWindow): Promise<MeetingRequestView[]> {
    const rows = await this.prisma.solicitudreunion.findMany({
      where: {
        estaActivo: 1,
        fechaHoraInicioPropuesta: { gte: window.start },
        fechaHoraFinPropuesta: { lte: window.end },
        OR: [
          { empresaEvento_id: companyEventId },
          { empresaEventorReceptora_id: companyEventId },
        ],
      },
      include: {
        empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { select: COMPANY_SELECT },
        empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
          select: COMPANY_SELECT,
        },
        mesa: { select: { id: true, numeroMesa: true } },
        reunion: {
          where: { estaActivo: 1 },
          select: { id: true, estadoReunion: true, mesa: { select: { numeroMesa: true } } },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    const pending = rows.filter((row) => row.estadoSolicitud === 'PENDIENTE');
    const clashing = await this.findClashing(pending);

    return rows.map((row) => ({
      id: row.id,
      tipo: row.tipoReunion,
      inicio: row.fechaHoraInicioPropuesta,
      fin: row.fechaHoraFinPropuesta,
      estado: row.estadoSolicitud,
      enlace: row.enlaceReunionVirtual,
      mensaje: row.mensajeParaEmpresaReceptora,
      motivo: row.motivoRechazoSolicitud,
      mesaId: row.mesa_id,
      mesa: row.mesa ? { id: row.mesa.id, numeroMesa: row.mesa.numeroMesa } : null,
      fechaCreacion: row.fechaCreacion,
      esMiSolicitud: row.empresaEvento_id === companyEventId,
      solicitanteEeId: row.empresaEvento_id,
      receptoraEeId: row.empresaEventorReceptora_id,
      tieneConflicto: clashing.has(row.id),
      solicitante: companyOf(
        row.empresaevento_solicitudreunion_empresaEvento_idToempresaevento,
      ),
      receptora: companyOf(
        row.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento,
      ),
      reunion: row.reunion[0]
        ? {
            id: row.reunion[0].id,
            estadoReunion: row.reunion[0].estadoReunion,
            numeroMesa: row.reunion[0].mesa?.numeroMesa ?? null,
          }
        : null,
    }));
  }

  /**
   * Which pending requests want the same table or the same hour as another one.
   * They are read in a single pass: the legacy screen asked once per row.
   */
  private async findClashing(pending: Row[]): Promise<Set<number>> {
    if (pending.length === 0) return new Set();

    const rivals = await this.prisma.solicitudreunion.findMany({
      where: {
        estaActivo: 1,
        estadoSolicitud: 'PENDIENTE',
        OR: [
          { mesa_id: { in: pending.map((row) => row.mesa_id).filter((id): id is number => id !== null) } },
          { empresaEvento_id: { in: pending.map((row) => row.empresaEvento_id) } },
        ],
      },
      select: {
        id: true,
        mesa_id: true,
        empresaEvento_id: true,
        fechaHoraInicioPropuesta: true,
        fechaHoraFinPropuesta: true,
      },
    });

    const clashing = new Set<number>();
    for (const request of pending) {
      const clash = rivals.some(
        (rival) =>
          rival.id !== request.id &&
          (rival.mesa_id === request.mesa_id || rival.empresaEvento_id === request.empresaEvento_id) &&
          rival.fechaHoraInicioPropuesta < request.fechaHoraFinPropuesta &&
          rival.fechaHoraFinPropuesta > request.fechaHoraInicioPropuesta,
      );
      if (clash) clashing.add(request.id);
    }

    return clashing;
  }

  async create(request: NewMeetingRequest): Promise<MeetingRequestRecord> {
    const row = await this.prisma.$transaction(
      async (tx) => {
        await this.lockTable(tx, request.mesaId, request.window, null);

        return tx.solicitudreunion.create({
          data: {
            empresaEvento_id: request.solicitanteId,
            empresaEventorReceptora_id: request.receptoraId,
            empresa_usuarioResponsableSolicitud: request.companyUserId,
            tipoReunion: request.tipoReunion,
            // The link of a virtual meeting is added later, by the event team.
            enlaceReunionVirtual: null,
            fechaHoraInicioPropuesta: request.window.start,
            fechaHoraFinPropuesta: request.window.end,
            mensajeParaEmpresaReceptora: request.mensaje,
            estadoSolicitud: 'PENDIENTE',
            mesa_id: request.mesaId,
            estaActivo: 1,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return toRecord(row);
  }

  async update(
    requestId: number,
    request: EditedMeetingRequest,
  ): Promise<MeetingRequestRecord> {
    const row = await this.prisma.$transaction(
      async (tx) => {
        await this.lockTable(tx, request.mesaId, request.window, requestId);

        return tx.solicitudreunion.update({
          where: { id: requestId },
          data: {
            tipoReunion: request.tipoReunion,
            fechaHoraInicioPropuesta: request.window.start,
            fechaHoraFinPropuesta: request.window.end,
            mesa_id: request.mesaId,
            mensajeParaEmpresaReceptora: request.mensaje,
            creadoModificadoFecha: new Date(),
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return toRecord(row);
  }

  async accept(
    requestId: number,
    eventId: number,
    mesaId: number | null,
  ): Promise<{ meetingId: number }> {
    return this.prisma.$transaction(
      async (tx) => {
        const request = await tx.solicitudreunion.findFirst({
          where: { id: requestId, estaActivo: 1, estadoSolicitud: 'PENDIENTE' },
        });
        if (!request) throw new ConflictError('Solicitud no encontrada o ya procesada');

        const window = {
          start: request.fechaHoraInicioPropuesta,
          end: request.fechaHoraFinPropuesta,
        };
        await this.lockTable(tx, mesaId, window, requestId);

        const meeting = await tx.reunion.create({
          data: {
            solicitudReunion_id: requestId,
            mesa_id: mesaId,
            evento_id: eventId,
            tipoReunion: request.tipoReunion,
            fechaHoraInicioReunion: window.start,
            fechaHoraFinReunion: window.end,
            estadoReunion: 'PROGRAMADA',
            seEnvioNotificacionDeRetraso: 0,
            cantidadAsistentesRegistrados: 0,
            estaActivo: 1,
          },
        });

        await tx.solicitudreunion.update({
          where: { id: requestId },
          data: { estadoSolicitud: 'ACEPTADA', creadoModificadoFecha: new Date() },
        });
        await this.retireOpenNotices(tx, request.empresaEventorReceptora_id, requestId);

        return { meetingId: meeting.id };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async reject(requestId: number, motivo: string | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const request = await tx.solicitudreunion.update({
        where: { id: requestId },
        data: {
          estadoSolicitud: 'RECHAZADA',
          motivoRechazoSolicitud: motivo,
          creadoModificadoFecha: new Date(),
        },
      });
      await this.retireOpenNotices(tx, request.empresaEventorReceptora_id, requestId);
    });
  }

  async cancel(requestId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const request = await tx.solicitudreunion.update({
        where: { id: requestId },
        data: { estadoSolicitud: 'CANCELADA', creadoModificadoFecha: new Date() },
      });
      await this.retireOpenNotices(tx, request.empresaEventorReceptora_id, requestId);
    });
  }

  async hasConfirmedMeeting(companyEventId: number, window: TimeWindow): Promise<boolean> {
    const meeting = await this.prisma.reunion.findFirst({
      where: {
        estaActivo: 1,
        estadoReunion: LIVE_MEETING,
        fechaHoraInicioReunion: { lt: window.end },
        fechaHoraFinReunion: { gt: window.start },
        solicitudreunion: {
          OR: [
            { empresaEvento_id: companyEventId },
            { empresaEventorReceptora_id: companyEventId },
          ],
        },
      },
      select: { id: true },
    });

    return meeting !== null;
  }

  async listPendingOnTable(
    requestId: number,
    mesaId: number,
    window: TimeWindow,
  ): Promise<{ id: number; solicitanteId: number }[]> {
    const rows = await this.prisma.solicitudreunion.findMany({
      where: {
        id: { not: requestId },
        mesa_id: mesaId,
        estaActivo: 1,
        estadoSolicitud: 'PENDIENTE',
        tipoReunion: 'PRESENCIAL',
        fechaHoraInicioPropuesta: { lt: window.end },
        fechaHoraFinPropuesta: { gt: window.start },
      },
      select: { id: true, empresaEvento_id: true },
    });

    return rows.map((row) => ({ id: row.id, solicitanteId: row.empresaEvento_id }));
  }

  async companyNameOf(companyEventId: number): Promise<string | null> {
    const row = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      select: { empresa: { select: { nombre: true } } },
    });
    return row?.empresa?.nombre ?? null;
  }

  /**
   * Serialises everything that wants one table, then re-checks it inside the
   * lock. Two requests arriving together would otherwise both find the table
   * free and both take it.
   */
  private async lockTable(
    tx: Record<string, any>,
    mesaId: number | null,
    window: TimeWindow,
    exceptRequestId: number | null,
  ): Promise<void> {
    if (!mesaId) return;

    await tx.$queryRaw`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(${TABLE_LOCK_NAMESPACE}, ${mesaId})) AS lock_row`;

    const [meeting, request] = await Promise.all([
      tx.reunion.findFirst({
        where: {
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
          ...(exceptRequestId ? { id: { not: exceptRequestId } } : {}),
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

  /** The bell entry that asked for an answer is done once the answer is given. */
  private async retireOpenNotices(
    tx: Record<string, any>,
    receptoraId: number,
    requestId: number,
  ): Promise<void> {
    await tx.notificacion.updateMany({
      where: {
        empresaevento_id: receptoraId,
        referenciaId: requestId,
        referenciaNombreTabla: 'solicitudreunion',
        tipoNotificacion: { in: ['solicitud:nueva', 'solicitud:editada'] },
        estaActivo: 1,
      },
      data: { estaActivo: 0, haSidoLeida: 1, creadoModificadoFecha: new Date() },
    });
  }
}
