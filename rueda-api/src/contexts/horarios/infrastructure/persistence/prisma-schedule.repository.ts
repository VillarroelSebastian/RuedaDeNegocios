import { Injectable } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { HourRange } from '../../../eventos/domain/services/meeting-hours.js';
import type {
  EnrollmentSchedule,
  ScheduleEvent,
  ScheduleRepositoryPort,
} from '../../domain/ports/schedule.repository.port.js';

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

type Row = Record<string, any>;

function toEvent(row: Row): ScheduleEvent {
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

@Injectable()
export class PrismaScheduleRepository implements ScheduleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEvent(): Promise<ScheduleEvent | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: EVENT_SELECT,
    });
    return row ? toEvent(row) : null;
  }

  async findEvent(eventId: number): Promise<ScheduleEvent | null> {
    const row = await this.prisma.evento.findFirst({
      where: { id: eventId, estaActivo: { not: 0 } },
      select: EVENT_SELECT,
    });
    return row ? toEvent(row) : null;
  }

  async findEnrollment(companyEventId: number): Promise<EnrollmentSchedule | null> {
    const row = await this.prisma.empresaevento.findFirst({
      where: { id: companyEventId, estaActivo: 1 },
      select: { id: true, evento_id: true, horariosDisponibilidadJson: true },
    });
    if (!row) return null;

    return {
      id: row.id,
      eventId: row.evento_id,
      horariosDisponibilidadJson: row.horariosDisponibilidadJson,
    };
  }

  async findRequestParties(
    requestId: number,
  ): Promise<{ solicitanteId: number; receptoraId: number } | null> {
    const row = await this.prisma.solicitudreunion.findUnique({
      where: { id: requestId },
      select: { empresaEvento_id: true, empresaEventorReceptora_id: true },
    });
    if (!row) return null;

    return {
      solicitanteId: row.empresaEvento_id,
      receptoraId: row.empresaEventorReceptora_id,
    };
  }

  async listMeetings(
    eventId: number,
    companyEventId: number,
    excludeMeetingId: number | null,
  ): Promise<TimeWindow[]> {
    const rows = await this.prisma.reunion.findMany({
      where: {
        evento_id: eventId,
        estaActivo: 1,
        estadoReunion: { not: 'CANCELADA' },
        ...(excludeMeetingId ? { id: { not: excludeMeetingId } } : {}),
        // A company is busy whichever side of the table it sits on.
        solicitudreunion: {
          OR: [
            { empresaEvento_id: companyEventId },
            { empresaEventorReceptora_id: companyEventId },
          ],
        },
      },
      select: { fechaHoraInicioReunion: true, fechaHoraFinReunion: true },
    });

    return rows.map((row) => ({
      start: row.fechaHoraInicioReunion,
      end: row.fechaHoraFinReunion,
    }));
  }

  async listPendingRequests(
    companyEventId: number,
    excludeRequestId: number | null,
  ): Promise<TimeWindow[]> {
    const rows = await this.prisma.solicitudreunion.findMany({
      where: {
        estaActivo: 1,
        estadoSolicitud: 'PENDIENTE',
        ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
        OR: [
          { empresaEvento_id: companyEventId },
          { empresaEventorReceptora_id: companyEventId },
        ],
      },
      select: { fechaHoraInicioPropuesta: true, fechaHoraFinPropuesta: true },
    });

    return rows.map((row) => ({
      start: row.fechaHoraInicioPropuesta,
      end: row.fechaHoraFinPropuesta,
    }));
  }

  async listBlocks(companyEventId: number): Promise<TimeWindow[]> {
    const rows = await this.prisma.empresa_bloqueo.findMany({
      where: { empresaevento_id: companyEventId, estaActivo: 1 },
      select: { inicio: true, fin: true },
    });

    return rows.map((row) => ({ start: row.inicio, end: row.fin }));
  }

  async listRanges(companyEventId: number): Promise<HourRange[]> {
    const rows = await this.prisma.empresa_horario.findMany({
      where: { empresaevento_id: companyEventId, estaActivo: 1 },
      orderBy: { desde_hora: 'asc' },
      select: { desde_hora: true, hasta_hora: true },
    });

    return rows.map((row) => ({ desde: row.desde_hora, hasta: row.hasta_hora }));
  }

  async replaceRanges(
    companyEventId: number,
    rangos: HourRange[],
    blocks: TimeWindow[],
  ): Promise<void> {
    // The ranges and the blocks derived from them are one decision, so they are
    // replaced together: a half-written schedule offers slots nobody honours.
    await this.prisma.$transaction(async (tx) => {
      await tx.empresa_horario.updateMany({
        where: { empresaevento_id: companyEventId, estaActivo: 1 },
        data: { estaActivo: 0 },
      });
      await tx.empresa_bloqueo.updateMany({
        where: { empresaevento_id: companyEventId, estaActivo: 1 },
        data: { estaActivo: 0 },
      });

      if (rangos.length > 0) {
        await tx.empresa_horario.createMany({
          data: rangos.map((range) => ({
            empresaevento_id: companyEventId,
            desde_hora: range.desde,
            hasta_hora: range.hasta,
          })),
        });
      }

      if (blocks.length > 0) {
        await tx.empresa_bloqueo.createMany({
          data: blocks.map((block) => ({
            empresaevento_id: companyEventId,
            inicio: block.start,
            fin: block.end,
          })),
        });
      }
    });
  }

  async saveDailyAvailability(companyEventId: number, stored: string): Promise<void> {
    await this.prisma.empresaevento.update({
      where: { id: companyEventId },
      data: { horariosDisponibilidadJson: stored, creadoModificadoFecha: new Date() },
    });
  }

  async clearBlocks(companyEventId: number): Promise<void> {
    await this.prisma.empresa_bloqueo.updateMany({
      where: { empresaevento_id: companyEventId, estaActivo: 1 },
      data: { estaActivo: 0 },
    });
  }

  async findBlockAt(companyEventId: number, start: Date): Promise<{ id: number } | null> {
    return this.prisma.empresa_bloqueo.findFirst({
      where: { empresaevento_id: companyEventId, inicio: start, estaActivo: 1 },
      select: { id: true },
    });
  }

  async deactivateBlock(blockId: number): Promise<void> {
    await this.prisma.empresa_bloqueo.update({
      where: { id: blockId },
      data: { estaActivo: 0 },
    });
  }

  async createBlock(companyEventId: number, window: TimeWindow): Promise<void> {
    await this.prisma.empresa_bloqueo.create({
      data: { empresaevento_id: companyEventId, inicio: window.start, fin: window.end },
    });
  }
}
