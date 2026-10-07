import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PushService } from '../push/push.service.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notificaciones' })
export class NotificacionesGateway {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService, private readonly push: PushService) {}
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = String(socket.handshake.auth?.token || socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const p = await this.jwt.verifyAsync<{ sub: number; role: string }>(token);
        const user = await this.prisma.usuario.findFirst({
          where: { id: Number(p.sub), rolEvento: p.role, estaActivo: 1 },
          select: { id: true, rolEvento: true, evento_id: true, empresa_usuario: { where: { estaActivo: 1, empresaevento: { estaActivo: 1 } }, select: { empresaevento_id: true, empresaevento: { select: { evento_id: true } } } } },
        });
        if (!user) return next(new Error('unauthorized'));
        socket.data.user = user;
        const principal = await this.prisma.evento.findFirst({ where: { esPrincipal: 1, estaActivo: { not: 0 } } });
        for (const m of user.empresa_usuario.filter(m => m.empresaevento.evento_id === principal?.id)) socket.join(`ee-${m.empresaevento_id}`);
        if (['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'].includes(user.rolEvento)) socket.join('staff');
        socket.join(`user-${user.id}`);
        for (const m of user.empresa_usuario.filter(m => m.empresaevento.evento_id === principal?.id)) socket.join(`evento-${m.empresaevento.evento_id}`);
        if (user.evento_id === principal?.id) socket.join(`evento-${user.evento_id}`);
        if (['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'].includes(user.rolEvento)) {
          if (principal) { socket.join(`evento-${principal.id}`); socket.join(`staff-evento-${principal.id}`); }
        }
        next();
      } catch { next(new Error('unauthorized')); }
    });
  }

  // Client joins a room keyed by empresaevento id
  @SubscribeMessage('unirse')
  handleUnirse(@MessageBody() data: { eeId: number }, @ConnectedSocket() client: Socket) {
    const memberships = client.data.user?.empresa_usuario || [];
    if (!memberships.some((m: any) => m.empresaevento_id === Number(data.eeId))) return { ok: false, error: 'forbidden' };
    const membership = memberships.find((m: any) => m.empresaevento_id === Number(data.eeId));
    if (!client.rooms.has(`evento-${membership?.empresaevento?.evento_id}`)) return { ok: false, error: 'forbidden' };
    const room = `ee-${data.eeId}`;
    client.join(room);
    return { ok: true };
  }

  // Emit helpers — called from the controller after DB mutations
  emitirParaEe(eeId: number, evento: string, payload: object) {
    this.server?.to(`ee-${eeId}`).emit(evento, payload);
    void this.push.enviar(eeId, evento, payload);
  }

  emitirParaStaff(evento: string, payload: object) {
    this.server?.to('staff').emit(evento, payload);
    void this.push.enviar('staff', evento, payload);
  }

  emitirParaUsuario(usuarioId: number, evento: string, payload: object) {
    this.server?.to(`user-${usuarioId}`).emit(evento, payload);
    void this.push.enviar({ usuarioId }, evento, payload);
  }

  emitirGlobal(evento: string, payload: object) {
    this.server?.emit(evento, payload);
    void this.push.enviar('global', evento, payload);
  }

  emitirParaEvento(eventoId: number, tipo: string, payload: object, soloStaff = false) {
    this.server?.to(`${soloStaff ? 'staff-evento' : 'evento'}-${eventoId}`).emit(tipo, payload);
    void this.push.enviar(soloStaff ? 'staff' : 'global', tipo, { ...payload, eventoId });
  }
}
