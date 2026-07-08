import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notificaciones' })
export class NotificacionesGateway {
  @WebSocketServer()
  server: Server;

  // Client joins a room keyed by empresaevento id
  @SubscribeMessage('unirse')
  handleUnirse(@MessageBody() data: { eeId: number }, @ConnectedSocket() client: Socket) {
    const room = `ee-${data.eeId}`;
    client.join(room);
  }

  // Emit helpers — called from the controller after DB mutations
  emitirParaEe(eeId: number, evento: string, payload: object) {
    this.server.to(`ee-${eeId}`).emit(evento, payload);
  }

  emitirGlobal(evento: string, payload: object) {
    this.server.emit(evento, payload);
  }
}
