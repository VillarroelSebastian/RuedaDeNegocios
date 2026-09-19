import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  EventConfigPatch,
  EventRecord,
  EventRepositoryPort,
  EventStats,
  QrRule,
} from '../../domain/ports/event.repository.port.js';
import type { EventSettings } from '../../domain/services/event-settings.js';
import { eventDates } from '../../domain/services/event-schedule.js';
import { toSchedule } from '../../application/use-cases/get-current-event.use-case.js';

const ACTIVE_QR_RULES = {
  eventoreglaqr: { where: { estadoActivo: 1 }, orderBy: { rangoDesde: 'asc' } },
} as const;

@Injectable()
export class PrismaEventRepository implements EventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipal(): Promise<EventRecord | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      include: ACTIVE_QR_RULES,
    });
    return row ? toDomain(row) : null;
  }

  async findById(id: number, options: { withQrRules?: boolean } = {}): Promise<EventRecord | null> {
    const row = await this.prisma.evento.findUnique({
      where: { id },
      ...(options.withQrRules ? { include: ACTIVE_QR_RULES } : {}),
    });
    return row ? toDomain(row) : null;
  }

  async listActive(): Promise<EventRecord[]> {
    const rows = await this.prisma.evento.findMany({
      where: { estaActivo: { not: 0 } },
      orderBy: [{ esPrincipal: 'desc' }, { fechaCreacion: 'desc' }],
    });
    return rows.map(toDomain);
  }

  async create(settings: EventSettings, qrRules: QrRule[]): Promise<EventRecord> {
    const row = await this.prisma.evento.create({
      data: {
        ...settings,
        estaActivo: 1,
        esPrincipal: 0,
        eventoreglaqr: { create: qrRules },
      },
      include: { eventoreglaqr: true },
    });
    return toDomain(row);
  }

  async update(id: number, settings: EventSettings): Promise<void> {
    await this.prisma.evento.update({
      where: { id },
      data: { ...settings, creadoModificadoFecha: new Date() },
    });
  }

  async replaceQrRules(eventId: number, qrRules: QrRule[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Logical replacement: old rules stay on disk so historical payments keep
      // pointing at the QR image they were made against.
      await tx.eventoreglaqr.updateMany({
        where: { evento_id: eventId, estadoActivo: 1 },
        data: { estadoActivo: 0, fechaModificacion: new Date() },
      });
      if (qrRules.length > 0) {
        await tx.eventoreglaqr.createMany({
          data: qrRules.map((rule) => ({ ...rule, evento_id: eventId })),
        });
      }
    });
  }

  async patchConfig(id: number, patch: EventConfigPatch): Promise<EventRecord> {
    const row = await this.prisma.evento.update({
      where: { id },
      data: { ...patch, creadoModificadoFecha: new Date() },
    });
    return toDomain(row);
  }

  async makePrincipal(id: number): Promise<EventRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.evento.updateMany({ where: {}, data: { esPrincipal: 0 } });
      return tx.evento.update({ where: { id }, data: { esPrincipal: 1 } });
    });
    return toDomain(row);
  }

  async deactivate(id: number): Promise<void> {
    await this.prisma.evento.update({ where: { id }, data: { estaActivo: 0 } });
  }

  async countActivePackages(eventId: number): Promise<number> {
    return this.prisma.paquete.count({ where: { evento_id: eventId, estaActivo: 1 } });
  }

  async statsFor(event: EventRecord): Promise<EventStats> {
    const dates = eventDates(toSchedule(event));
    const activityFilter =
      dates.length === 0
        ? { id: -1 }
        : {
            evento_id: event.id,
            estaActivo: 1,
            fechaActividad: {
              gte: new Date(`${dates[0]}T00:00:00.000Z`),
              lte: new Date(`${dates[dates.length - 1]}T23:59:59.999Z`),
            },
          };

    const [empresasCount, mesasCount, actividadesCount, tecnicosCount] = await Promise.all([
      this.prisma.empresaevento.count({ where: { evento_id: event.id, estaActivo: 1 } }),
      this.prisma.mesa.count({ where: { evento_id: event.id, estaActivo: 1 } }),
      this.prisma.actividadprograma.count({ where: activityFilter }),
      this.prisma.usuario.count({
        where: { estaActivo: 1, rolEvento: { in: ['TECNICO', 'TECNICO_EVENTOS'] } },
      }),
    ]);

    return { empresasCount, mesasCount, actividadesCount, tecnicosCount };
  }
}

/** Prisma returns `Decimal` for money columns; the domain works in numbers. */
function toNumber(value: unknown): number {
  return typeof value === 'object' && value !== null && 'toNumber' in value
    ? (value as { toNumber(): number }).toNumber()
    : Number(value);
}

interface EventoRow {
  eventoreglaqr?: {
    id: number;
    rangoDesde: number;
    rangoHasta: number;
    monto: unknown;
    urlQR: string;
  }[];
  montoBaseIncripcionBolivianos: unknown;
  [key: string]: unknown;
}

function toDomain(row: EventoRow): EventRecord {
  const { eventoreglaqr, ...event } = row;
  return {
    ...(event as unknown as EventRecord),
    montoBaseIncripcionBolivianos: toNumber(row.montoBaseIncripcionBolivianos),
    ...(eventoreglaqr && {
      reglasQR: eventoreglaqr.map((rule) => ({
        id: rule.id,
        rangoDesde: rule.rangoDesde,
        rangoHasta: rule.rangoHasta,
        monto: toNumber(rule.monto),
        urlQR: rule.urlQR,
      })),
    }),
  };
}
