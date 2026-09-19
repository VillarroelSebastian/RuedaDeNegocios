import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { TableProvisioningPort } from '../../../eventos/domain/ports/table-provisioning.port.js';

/** Meeting states that make a table genuinely occupied. */
const LIVE_MEETING_STATES = ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'];

@Injectable()
export class PrismaTableProvisioningAdapter implements TableProvisioningPort {
  constructor(private readonly prisma: PrismaService) {}

  async syncTables(eventId: number, total: number, capacityPerTable: number): Promise<void> {
    if (!eventId || total < 1) return;

    const existing = await this.prisma.mesa.findMany({
      where: { evento_id: eventId },
      select: { numeroMesa: true },
    });
    const present = new Set(existing.map((table) => table.numeroMesa));
    const missing = Array.from({ length: total }, (_, index) => index + 1).filter(
      (number) => !present.has(number),
    );

    await this.prisma.$transaction(async (tx) => {
      if (missing.length > 0) {
        await tx.mesa.createMany({
          data: missing.map((numeroMesa) => ({
            evento_id: eventId,
            numeroMesa,
            capacidadPersonas: capacityPerTable,
            estaActivo: 1,
            estaHabilitada: 1,
          })),
        });
      }

      await tx.mesa.updateMany({
        where: { evento_id: eventId, numeroMesa: { lte: total } },
        data: { estaActivo: 1, capacidadPersonas: capacityPerTable },
      });

      // Shrinking the event must never strand a meeting that is already booked,
      // so surplus tables still in use survive the cut.
      const occupied = await tx.mesa.findMany({
        where: {
          evento_id: eventId,
          numeroMesa: { gt: total },
          estaActivo: 1,
          reunion: { some: { estaActivo: 1, estadoReunion: { in: LIVE_MEETING_STATES } } },
        },
        select: { id: true },
      });
      const preBooked = await tx.solicitudreunion.findMany({
        where: {
          mesa: { evento_id: eventId, numeroMesa: { gt: total }, estaActivo: 1 },
          estaActivo: 1,
          estadoSolicitud: 'PENDIENTE',
          mesa_id: { not: null },
        },
        select: { mesa_id: true },
      });

      const protectedIds = [
        ...new Set([
          ...occupied.map((table) => table.id),
          ...preBooked
            .map((request) => request.mesa_id)
            .filter((id): id is number => id !== null),
        ]),
      ];

      await tx.mesa.updateMany({
        where: {
          evento_id: eventId,
          numeroMesa: { gt: total },
          estaActivo: 1,
          ...(protectedIds.length > 0 ? { id: { notIn: protectedIds } } : {}),
        },
        data: { estaActivo: 0 },
      });
    });
  }
}
