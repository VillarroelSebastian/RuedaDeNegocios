import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  CompanyNotification,
  CompanyNotifierPort,
} from '../../../../shared/application/ports/company-notifier.port.js';
import {
  REALTIME_PUBLISHER_PORT,
  type RealtimePublisherPort,
} from '../../../../shared/application/ports/realtime-publisher.port.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';

@Injectable()
export class PrismaCompanyNotifierAdapter implements CompanyNotifierPort {
  private readonly logger = new Logger(PrismaCompanyNotifierAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REALTIME_PUBLISHER_PORT) private readonly realtime: RealtimePublisherPort,
  ) {}

  async notify(notification: CompanyNotification): Promise<void> {
    try {
      await this.prisma.notificacion.create({
        data: {
          empresaevento_id: notification.companyEventId,
          tituloNotificacion: notification.titulo,
          mensajeNotificacion: notification.mensaje,
          tipoNotificacion: notification.tipo,
          referenciaId: notification.referenciaId ?? 0,
          referenciaNombreTabla: notification.referenciaTabla ?? '-',
          haSidoLeida: 0,
          estaActivo: 1,
        },
      });
    } catch (error) {
      // The live push still goes out: losing the bell entry is better than
      // losing the notification altogether.
      this.logger.warn(`Could not persist notification ${notification.tipo}: ${String(error)}`);
    }

    this.realtime.toCompanyEvent(notification.companyEventId, notification.tipo, {
      titulo: notification.titulo,
      mensaje: notification.mensaje,
    });
  }

  async notifyOnce(
    notification: CompanyNotification & { referenciaId: number },
  ): Promise<void> {
    const existing = await this.prisma.notificacion.findFirst({
      where: {
        empresaevento_id: notification.companyEventId,
        tipoNotificacion: notification.tipo,
        referenciaId: notification.referenciaId,
        estaActivo: 1,
      },
      select: { id: true },
    });
    if (existing) return;

    await this.notify({ referenciaTabla: 'reunion', ...notification });
  }
}
