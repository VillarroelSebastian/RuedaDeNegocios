import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  CompanyNotificationView,
  NotificationsRepositoryPort,
  PendingWork,
  PendingWorkItem,
  StaffNotificationView,
} from '../../domain/ports/notifications.repository.port.js';

/** How much of each kind of pending work the administrator is shown. */
const PENDING_PAGE = { pagos: 10, observados: 5, adicionales: 10, total: 15 } as const;

@Injectable()
export class PrismaNotificationsRepository implements NotificationsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEventId(): Promise<number | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async listForCompany(
    companyEventId: number,
    limit: number,
  ): Promise<CompanyNotificationView[]> {
    const rows = await this.prisma.notificacion.findMany({
      where: { empresaevento_id: companyEventId, estaActivo: 1 },
      orderBy: { fechaCreacion: 'desc' },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      titulo: row.tituloNotificacion,
      mensaje: row.mensajeNotificacion,
      tipo: row.tipoNotificacion,
      referenciaId: row.referenciaId,
      referenciaTipo: row.referenciaNombreTabla,
      leida: row.haSidoLeida === 1,
      fecha: row.fechaCreacion,
    }));
  }

  async countUnreadForCompany(companyEventId: number): Promise<number> {
    return this.prisma.notificacion.count({
      where: { empresaevento_id: companyEventId, estaActivo: 1, haSidoLeida: 0 },
    });
  }

  async markAllReadForCompany(companyEventId: number): Promise<void> {
    await this.prisma.notificacion.updateMany({
      where: { empresaevento_id: companyEventId, estaActivo: 1, haSidoLeida: 0 },
      data: { haSidoLeida: 1, creadoModificadoFecha: new Date() },
    });
  }

  async listForStaff(eventId: number, limit: number): Promise<StaffNotificationView[]> {
    const rows = await this.prisma.notificacionstaff.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      // Urgent first, then newest: the board is read top to bottom.
      orderBy: [{ urgente: 'desc' }, { fechaCreacion: 'desc' }],
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      titulo: row.tituloNotificacion,
      mensaje: row.mensajeNotificacion,
      tipo: row.tipoNotificacion,
      referenciaId: row.referenciaId,
      referenciaTipo: row.referenciaNombreTabla,
      urgente: row.urgente === 1,
      fecha: row.fechaCreacion,
    }));
  }

  async listPendingWork(eventId: number): Promise<PendingWork> {
    const [pendientes, observados, adicionales] = await Promise.all([
      this.prisma.empresaevento.findMany({
        where: { evento_id: eventId, estadoVerificacionPago: 'PENDIENTE', estaActivo: 1 },
        take: PENDING_PAGE.pagos,
        orderBy: { fechaCreacion: 'desc' },
        select: {
          id: true,
          fechaCreacion: true,
          fechaHoraEnvioComprobante: true,
          empresa: { select: { nombre: true } },
        },
      }),
      this.prisma.empresaevento.findMany({
        where: { evento_id: eventId, estadoVerificacionPago: 'OBSERVADO', estaActivo: 1 },
        take: PENDING_PAGE.observados,
        orderBy: { fechaCreacion: 'desc' },
        select: { id: true, fechaCreacion: true, empresa: { select: { nombre: true } } },
      }),
      this.prisma.empresaeventocomprobantes.findMany({
        where: {
          tipoPago: 'ADICIONAL',
          estadoPago: 'PENDIENTE',
          estaActivo: 1,
          empresaevento: { evento_id: eventId, estaActivo: 1 },
        },
        take: PENDING_PAGE.adicionales,
        orderBy: { fechaCreacion: 'desc' },
        select: {
          id: true,
          fechaCreacion: true,
          cantidadParticipantes: true,
          empresaevento: { select: { empresa: { select: { nombre: true } } } },
        },
      }),
    ]);

    const items: PendingWorkItem[] = [
      ...pendientes.map((row) => ({
        id: `pago-${row.id}`,
        tipo: 'pago_pendiente',
        titulo: 'Pago pendiente de verificación',
        mensaje: `${row.empresa.nombre} envió un comprobante de pago`,
        fecha: row.fechaHoraEnvioComprobante ?? row.fechaCreacion,
        enlace: `/admin/pagos/${row.id}`,
      })),
      ...observados.map((row) => ({
        id: `obs-${row.id}`,
        tipo: 'pago_observado',
        titulo: 'Pago con observación',
        mensaje: `${row.empresa.nombre} tiene un pago con observaciones`,
        fecha: row.fechaCreacion,
        enlace: `/admin/pagos/${row.id}`,
      })),
      ...adicionales.map((row) => ({
        id: `pago-adicional-${row.id}`,
        tipo: 'pago_adicional_pendiente',
        titulo: 'Pago adicional pendiente',
        mensaje: `${row.empresaevento.empresa.nombre} solicitó ${row.cantidadParticipantes ?? 0} cupo(s) adicional(es)`,
        fecha: row.fechaCreacion,
        enlace: '/admin/pagos-adicionales',
      })),
    ].sort((left, right) => right.fecha.getTime() - left.fecha.getTime());

    // The total counts everything waiting, not just the slice that is shown.
    return { items: items.slice(0, PENDING_PAGE.total), total: items.length };
  }
}
