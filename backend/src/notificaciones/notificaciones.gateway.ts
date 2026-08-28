import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notificaciones' })
export class NotificacionesGateway {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = String(socket.handshake.auth?.token || socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const p = await this.jwt.verifyAsync<{ sub: number; role: string }>(token);
        const user = await this.prisma.usuario.findFirst({
          where: { id: Number(p.sub), rolEvento: p.role, estaActivo: 1 },
          select: { id: true, rolEvento: true, empresa_usuario: { where: { estaActivo: 1 }, select: { empresaevento_id: true } } },
        });
        if (!user) return next(new Error('unauthorized'));
        socket.data.user = user;
        for (const m of user.empresa_usuario) socket.join(`ee-${m.empresaevento_id}`);
        if (['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'].includes(user.rolEvento)) socket.join('staff');
        next();
      } catch { next(new Error('unauthorized')); }
    });
  }

  // Client joins a room keyed by empresaevento id
  @SubscribeMessage('unirse')
  handleUnirse(@MessageBody() data: { eeId: number }, @ConnectedSocket() client: Socket) {
    const memberships = client.data.user?.empresa_usuario || [];
    if (!memberships.some((m: any) => m.empresaevento_id === Number(data.eeId))) return { ok: false, error: 'forbidden' };
    const room = `ee-${data.eeId}`;
    client.join(room);
    return { ok: true };
  }

  // Emit helpers — called from the controller after DB mutations
  emitirParaEe(eeId: number, evento: string, payload: object) {
    this.server.to(`ee-${eeId}`).emit(evento, payload);
  }

  emitirParaStaff(evento: string, payload: object) {
    this.server.to('staff').emit(evento, payload);
  }

  emitirGlobal(evento: string, payload: object) {
    this.server.emit(evento, payload);
  }
}
