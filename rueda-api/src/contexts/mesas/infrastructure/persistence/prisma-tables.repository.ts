import { Injectable } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  CompanyBrief,
  TableBookings,
  TableEventConfig,
  TablePatch,
  TableSummary,
  TablesRepositoryPort,
} from '../../domain/ports/tables.repository.port.js';
import { PrismaTableProvisioningAdapter } from './prisma-table-provisioning.adapter.js';

const EVENT_SELECT = {
  id: true,
  fechaInicioEvento: true,
  fechaFinEvento: true,
  fechaInicioSolicitudes: true,
  fechaFinSolicitudes: true,
  horariosReunionJson: true,
  duracionReunion: true,
  tiempoEntreReuniones: true,
  cantidadTotalMesasEvento: true,
  capacidadPersonasPorMesa: true,
} as const;

const COMPANY_SELECT = {
  empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } },
} as const;

const REQUEST_PARTIES = {
  empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { select: COMPANY_SELECT },
  empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
    select: COMPANY_SELECT,
  },
} as const;

/** Both sides of a booking must still be enrolled and active to hold a table. */
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

const LIVE_MEETING = { not: 'CANCELADA' };

type Row = Record<string, any>;

function toEvent(row: Row): TableEventConfig {
  return {
    id: row.id,
    startsAt: row.fechaInicioEvento,
    endsAt: row.fechaFinEvento,
    registrationStartsAt: row.fechaInicioSolicitudes,
    registrationEndsAt: row.fechaFinSolicitudes,
    meetingHoursJson: row.horariosReunionJson,
    duracionReunion: row.duracionReunion,
    tiempoEntreReuniones: row.tiempoEntreReuniones,
    cantidadTotalMesasEvento: row.cantidadTotalMesasEvento,
    capacidadPersonasPorMesa: row.capacidadPersonasPorMesa,
  };
}

function toCompany(side: Row | null | undefined): CompanyBrief | null {
  const company = side?.empresa;
  return company
    ? {
        id: company.id,
        nombre: company.nombre,
        rubro: company.rubro ?? null,
        urlFotoPerfil: company.urlFotoPerfil ?? null,
      }
    : null;
}

function nameOf(side: Row | null | undefined): string {
  return side?.empresa?.nombre ?? '—';
}

function toTable(row: Row): TableBookings {
  return {
    id: row.id,
    numeroMesa: row.numeroMesa,
    capacidadPersonas: row.capacidadPersonas,
    estaHabilitada: row.estaHabilitada === 1,
    reuniones: (row.reunion ?? []).map((meeting: Row) => ({
      id: meeting.id,
      estadoReunion: meeting.estadoReunion,
      tipoReunion: meeting.tipoReunion,
      inicio: meeting.fechaHoraInicioReunion,
      fin: meeting.fechaHoraFinReunion,
      solicitante: toCompany(
        meeting.solicitudreunion
          ?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento,
      ),
      receptora: toCompany(
        meeting.solicitudreunion
          ?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento,
      ),
    })),
    solicitudesEnEspera: (row.solicitudreunion ?? []).map((request: Row) => ({
      solicitudId: request.id,
      inicio: request.fechaHoraInicioPropuesta,
      fin: request.fechaHoraFinPropuesta,
      solicitante: nameOf(
        request.empresaevento_solicitudreunion_empresaEvento_idToempresaevento,
      ),
      receptora: nameOf(
        request.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento,
      ),
    })),
    bloqueos: (row.mesabloque ?? []).map((block: Row) => ({
      id: block.id,
      inicio: block.fechaHoraInicio,
      fin: block.fechaHoraFin ?? null,
      estaOcupado: block.estaOcupado === 1,
    })),
  };
}

function toSummary(row: Row): TableSummary {
  return {
    id: row.id,
    numeroMesa: row.numeroMesa,
    capacidadPersonas: row.capacidadPersonas,
    estaHabilitada: row.estaHabilitada === 1,
  };
}

@Injectable()
export class PrismaTablesRepository implements TablesRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: PrismaTableProvisioningAdapter,
  ) {}

  async findPrincipalEvent(): Promise<TableEventConfig | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: EVENT_SELECT,
    });
    return row ? toEvent(row) : null;
  }

  async listBookings(eventId: number, window: TimeWindow): Promise<TableBookings[]> {
    const rows = await this.prisma.mesa.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: { numeroMesa: 'asc' },
      ...this.bookingsInclude(eventId, window),
    });
    return rows.map(toTable);
  }

  async findBookings(
    tableId: number,
    eventId: number,
    window: TimeWindow,
  ): Promise<TableBookings | null> {
    const row = await this.prisma.mesa.findFirst({
      where: { id: tableId, evento_id: eventId, estaActivo: 1 },
      ...this.bookingsInclude(eventId, window),
    });
    return row ? toTable(row) : null;
  }

  async listBookableTables(eventId: number): Promise<TableSummary[]> {
    const rows = await this.prisma.mesa.findMany({
      where: { evento_id: eventId, estaActivo: 1, estaHabilitada: 1 },
      orderBy: { numeroMesa: 'asc' },
      select: { id: true, numeroMesa: true, capacidadPersonas: true, estaHabilitada: true },
    });
    return rows.map(toSummary);
  }

  async listTableUsage(eventId: number): Promise<Map<number, number>> {
    const rows = await this.prisma.reunion.groupBy({
      by: ['mesa_id'],
      where: { evento_id: eventId, estaActivo: 1, estadoReunion: LIVE_MEETING },
      _count: { id: true },
    });

    return new Map(
      rows
        .filter((row) => row.mesa_id !== null)
        .map((row) => [row.mesa_id as number, row._count.id]),
    );
  }

  async listBusyTableIds(
    eventId: number,
    window: TimeWindow,
    exceptRequestId: number | null = null,
  ): Promise<number[]> {
    const [meetings, requests] = await Promise.all([
      this.prisma.reunion.findMany({
        where: {
          evento_id: eventId,
          estaActivo: 1,
          estadoReunion: LIVE_MEETING,
          fechaHoraInicioReunion: { lt: window.end },
          fechaHoraFinReunion: { gt: window.start },
        },
        select: { mesa_id: true },
      }),
      // A request that already named a table holds it while it waits, or two
      // companies end up booked onto the same table.
      this.prisma.solicitudreunion.findMany({
        where: {
          ...(exceptRequestId ? { id: { not: exceptRequestId } } : {}),
          estaActivo: 1,
          estadoSolicitud: 'PENDIENTE',
          tipoReunion: 'PRESENCIAL',
          mesa_id: { not: null },
          fechaHoraInicioPropuesta: { lt: window.end },
          fechaHoraFinPropuesta: { gt: window.start },
          empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
            evento_id: eventId,
          },
        },
        select: { mesa_id: true },
      }),
    ]);

    const busy = [...meetings, ...requests]
      .map((row) => row.mesa_id)
      .filter((id): id is number => id !== null);

    return [...new Set(busy)];
  }

  async listBusyWindows(
    tableId: number,
    eventId: number,
    day: TimeWindow,
  ): Promise<TimeWindow[]> {
    const [meetings, requests] = await Promise.all([
      this.prisma.reunion.findMany({
        where: {
          mesa_id: tableId,
          evento_id: eventId,
          estaActivo: 1,
          estadoReunion: LIVE_MEETING,
          fechaHoraInicioReunion: { lt: day.end },
          fechaHoraFinReunion: { gt: day.start },
        },
        select: { fechaHoraInicioReunion: true, fechaHoraFinReunion: true },
      }),
      this.prisma.solicitudreunion.findMany({
        where: {
          mesa_id: tableId,
          estaActivo: 1,
          estadoSolicitud: 'PENDIENTE',
          tipoReunion: 'PRESENCIAL',
          fechaHoraInicioPropuesta: { lt: day.end },
          fechaHoraFinPropuesta: { gt: day.start },
        },
        select: { fechaHoraInicioPropuesta: true, fechaHoraFinPropuesta: true },
      }),
    ]);

    return [
      ...meetings.map((meeting) => ({
        start: meeting.fechaHoraInicioReunion,
        end: meeting.fechaHoraFinReunion,
      })),
      ...requests.map((request) => ({
        start: request.fechaHoraInicioPropuesta,
        end: request.fechaHoraFinPropuesta,
      })),
    ];
  }

  async findTable(tableId: number, eventId: number): Promise<TableSummary | null> {
    const row = await this.prisma.mesa.findFirst({
      where: { id: tableId, evento_id: eventId, estaActivo: 1 },
      select: { id: true, numeroMesa: true, capacidadPersonas: true, estaHabilitada: true },
    });
    return row ? toSummary(row) : null;
  }

  async setTableTotal(eventId: number, total: number, capacityPerTable: number): Promise<void> {
    await this.prisma.evento.update({
      where: { id: eventId },
      data: {
        cantidadTotalMesasEvento: total,
        capacidadPersonasPorMesa: capacityPerTable,
        creadoModificadoFecha: new Date(),
      },
    });

    await this.provisioning.syncTables(eventId, total, capacityPerTable);
  }

  async updateTable(tableId: number, patch: TablePatch): Promise<TableSummary> {
    const row = await this.prisma.mesa.update({
      where: { id: tableId },
      data: {
        ...(patch.capacidadPersonas === undefined
          ? {}
          : { capacidadPersonas: patch.capacidadPersonas }),
        ...(patch.estaHabilitada === undefined
          ? {}
          : { estaHabilitada: patch.estaHabilitada ? 1 : 0 }),
        creadoModificadoFecha: new Date(),
      },
      select: { id: true, numeroMesa: true, capacidadPersonas: true, estaHabilitada: true },
    });
    return toSummary(row);
  }

  async deactivateTable(tableId: number): Promise<void> {
    await this.prisma.mesa.update({
      where: { id: tableId },
      data: { estaActivo: 0, creadoModificadoFecha: new Date() },
    });
  }

  /** Meetings and waiting requests of a table, bounded by the meeting window. */
  private bookingsInclude(eventId: number, window: TimeWindow) {
    return {
      include: {
        reunion: {
          where: {
            evento_id: eventId,
            estaActivo: 1,
            fechaHoraInicioReunion: { gte: window.start },
            fechaHoraFinReunion: { lte: window.end },
            solicitudreunion: BOTH_PARTIES_ACTIVE,
          },
          orderBy: { fechaHoraInicioReunion: 'asc' as const },
          include: { solicitudreunion: { include: REQUEST_PARTIES } },
        },
        solicitudreunion: {
          where: {
            estaActivo: 1,
            estadoSolicitud: 'PENDIENTE',
            fechaHoraInicioPropuesta: { gte: window.start },
            fechaHoraFinPropuesta: { lte: window.end },
            ...BOTH_PARTIES_ACTIVE,
          },
          orderBy: { fechaHoraInicioPropuesta: 'asc' as const },
          include: REQUEST_PARTIES,
        },
        mesabloque: {
          where: { estaActivo: 1 },
          orderBy: { fechaHoraInicio: 'asc' as const },
        },
      },
    };
  }
}
