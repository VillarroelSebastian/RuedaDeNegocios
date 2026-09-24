import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  readonly publicKey = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
    ? process.env.VAPID_PUBLIC_KEY : null;
  constructor(private readonly prisma: PrismaService) {
    if (this.publicKey) webpush.setVapidDetails(process.env.VAPID_SUBJECT!, this.publicKey, process.env.VAPID_PRIVATE_KEY!);
  }
  async enviar(audiencia: number | 'staff' | 'global', tipo: string, payload: any) {
    if (!payload.titulo || !payload.mensaje) return;
    try {
      const evento = await this.prisma.evento.findFirst({ where: { esPrincipal: 1, estaActivo: { not: 0 } }, select: { id: true } });
      if (!evento) return;
      const staff = { rolEvento: { in: ['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'] } };
      const empresa = { rolEvento: 'EMPRESA', empresa_usuario: { some: {
        estaActivo: 1, ...(typeof audiencia === 'number' ? { empresaevento_id: audiencia } : {}),
        empresaevento: { evento_id: evento.id, estaActivo: 1, estadoHabilitacionAcceso: 'HABILITADO', estadoVerificacionPago: 'COMPLETADO' },
      } } };
      const usuarios = await this.prisma.usuario.findMany({
        where: { estaActivo: 1, id: { not: Number(payload.excludeUserId) || 0 },
          ...(audiencia === 'staff' ? staff : typeof audiencia === 'number' ? empresa :
            { OR: [staff, empresa, { rolEvento: 'FORO', evento_id: evento.id }] }) },
        select: { id: true, rolEvento: true },
      });
      const roles = new Map(usuarios.map((u) => [u.id, u.rolEvento]));
      const destinos = await this.prisma.pushsubscription.findMany({ where: { usuarioId: { in: usuarios.map((u) => u.id) },
        actualizado: { gte: new Date(Date.now() - 90 * 86400000) } } });
      for (let i = 0; i < destinos.length; i += 10) {
        await Promise.all(destinos.slice(i, i + 10).map(async (destino) => {
          const role = roles.get(destino.usuarioId);
          const base = role === 'FORO' ? '/foro' : role === 'EMPRESA' ? '/empresa' : role === 'ADMINISTRADOR' ? '/admin' : '/tecnico';
          const url = base === '/foro' ? '/foro' : base + (tipo.startsWith('chat-interno') ? '/equipo' : tipo.startsWith('mensaje') ? '/mensajes' : '/dashboard');
          // El contenido privado se consulta únicamente después de iniciar sesión.
          const mensaje = { title: String(payload.titulo).slice(0, 150), body: 'Tienes una nueva actualización en Rueda de Negocios.', data: { url, tipo }, tag: tipo };
          try {
            if (destino.tipo === 'web' && this.publicKey) {
              await webpush.sendNotification({ endpoint: destino.destino, keys: { p256dh: destino.p256dh!, auth: destino.auth! } },
                JSON.stringify(mensaje), { TTL: 3600, timeout: 10000 });
            } else if (destino.tipo === 'expo') {
              const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST', signal: AbortSignal.timeout(10000),
                headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: 'Bearer ' + process.env.EXPO_ACCESS_TOKEN } : {}) },
                body: JSON.stringify({ to: destino.destino, sound: 'default', channelId: 'eventos', title: mensaje.title, body: mensaje.body, data: mensaje.data }),
              });
              if (!response.ok) throw new Error('Expo HTTP ' + response.status);
              const result = await response.json() as any;
              if (result.data?.details?.error === 'DeviceNotRegistered')
                await this.prisma.pushsubscription.deleteMany({ where: { id: destino.id } });
              else if (result.data?.status === 'error' || result.errors?.length) throw new Error('Expo rechazó la notificación');
            }
          } catch (error: any) {
            if ([404, 410].includes(error?.statusCode))
              await this.prisma.pushsubscription.deleteMany({ where: { id: destino.id } });
            else this.logger.warn('No se pudo entregar una notificación push (' + destino.tipo + ').');
          }
        }));
      }
    } catch { this.logger.warn('No se pudo procesar el envío push.'); }
  }
}
