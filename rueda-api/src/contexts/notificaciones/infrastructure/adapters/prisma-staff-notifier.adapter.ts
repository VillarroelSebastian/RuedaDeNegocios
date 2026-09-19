import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REALTIME_PUBLISHER_PORT,
  type RealtimePublisherPort,
} from '../../../../shared/application/ports/realtime-publisher.port.js';
import type {
  StaffNotification,
  StaffNotifierPort,
} from '../../../../shared/application/ports/staff-notifier.port.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';

const MS_PER_MINUTE = 60_000;

@Injectable()
export class PrismaStaffNotifierAdapter implements StaffNotifierPort {
  private readonly logger = new Logger(PrismaStaffNotifierAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REALTIME_PUBLISHER_PORT) private readonly realtime: RealtimePublisherPort,
  ) {}

  async notify(notification: StaffNotification): Promise<void> {
    try {
      if (await this.alreadyRaised(notification)) return;

      await this.prisma.notificacionstaff.create({
        data: {
          evento_id: notification.eventId,
          tituloNotificacion: notification.titulo,
          mensajeNotificacion: notification.mensaje,
          tipoNotificacion: notification.tipo,
          referenciaId: notification.referenciaId,
          referenciaNombreTabla: notification.referenciaTabla ?? 'reunion',
          urgente: notification.urgente ? 1 : 0,
          estaActivo: 1,
        },
      });
    } catch (error) {
      // The live push still goes out: losing the board entry is better than
      // losing the notice altogether.
      this.logger.warn(`Could not persist staff notification ${notification.tipo}: ${String(error)}`);
    }

    this.realtime.toStaff(notification.tipo, {
      titulo: notification.titulo,
      mensaje: notification.mensaje,
      referenciaId: notification.referenciaId,
      urgente: Boolean(notification.urgente),
    });
  }

  private async alreadyRaised(notification: StaffNotification): Promise<boolean> {
    const minutes = notification.evitarDuplicadoMinutos ?? 0;
    if (minutes <= 0) return false;

    const since = new Date(Date.now() - minutes * MS_PER_MINUTE);
    const existing = await this.prisma.notificacionstaff.findFirst({
      where: {
        evento_id: notification.eventId,
        tipoNotificacion: notification.tipo,
        referenciaId: notification.referenciaId,
        estaActivo: 1,
        fechaCreacion: { gte: since },
      },
      select: { id: true },
    });

    return existing !== null;
  }
}
