import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type { RealtimePublisherPort } from '../../../../shared/application/ports/realtime-publisher.port.js';
import { STAFF_ROLES, type Role } from '../../../../shared/domain/role.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';

const companyRoom = (companyEventId: number) => `ee-${companyEventId}`;
const STAFF_ROOM = 'staff';

/**
 * Live notifications channel. The handshake is authenticated the same way the
 * HTTP guard is — the token identifies the caller, the memberships are re-read
 * from the database — and each socket joins only the rooms it belongs to.
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notificaciones' })
export class NotificationsGateway implements RealtimePublisherPort {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      try {
        const raw = String(
          socket.handshake.auth?.token || socket.handshake.headers.authorization || '',
        ).replace(/^Bearer\s+/i, '');

        const claims = await this.jwt.verifyAsync<{ sub: number; role: Role }>(raw);
        const user = await this.prisma.usuario.findFirst({
          where: { id: Number(claims.sub), rolEvento: claims.role, estaActivo: 1 },
          select: {
            id: true,
            rolEvento: true,
            empresa_usuario: { where: { estaActivo: 1 }, select: { empresaevento_id: true } },
          },
        });
        if (!user) return next(new Error('unauthorized'));

        socket.data.user = user;
        for (const membership of user.empresa_usuario) {
          void socket.join(companyRoom(membership.empresaevento_id));
        }
        if (STAFF_ROLES.includes(user.rolEvento as Role)) void socket.join(STAFF_ROOM);
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    });
  }

  /** Re-joining a room is only allowed for a membership the caller holds. */
  @SubscribeMessage('unirse')
  handleJoin(
    @MessageBody() data: { eeId: number },
    @ConnectedSocket() client: Socket,
  ): { ok: boolean; error?: string } {
    const memberships: { empresaevento_id: number }[] = client.data.user?.empresa_usuario ?? [];
    const allowed = memberships.some(
      (membership) => membership.empresaevento_id === Number(data.eeId),
    );
    if (!allowed) return { ok: false, error: 'forbidden' };

    void client.join(companyRoom(Number(data.eeId)));
    return { ok: true };
  }

  toCompanyEvent(companyEventId: number, event: string, payload: object): void {
    this.server.to(companyRoom(companyEventId)).emit(event, payload);
  }

  toStaff(event: string, payload: object): void {
    this.server.to(STAFF_ROOM).emit(event, payload);
  }

  broadcast(event: string, payload: object): void {
    this.server.emit(event, payload);
  }
}
