import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway.js';

@Injectable()
export class MensajeriaService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: NotificacionesGateway) {}

  async evento(user: any) {
    const principal = await this.prisma.evento.findFirst({ where: { esPrincipal: 1, estaActivo: { not: 0 } } });
    if (!principal) throw new BadRequestException('No hay evento activo');
    if (!['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS', 'EMPRESA'].includes(user.role))
      throw new ForbiddenException('No tienes acceso a mensajería');
    if (user.role === 'EMPRESA' && !await this.prisma.empresa_usuario.findFirst({
      where: { usuario_id: user.sub, estaActivo: 1, empresaevento: { evento_id: principal.id, estaActivo: 1 } },
    })) throw new ForbiddenException('No perteneces a este evento');
    return principal.id;
  }

  async contexto(user: any, canal: string, eeId: number, otroEeId: number) {
    const eventoId = await this.evento(user);
    if (!['empresa', 'staff', 'interno'].includes(canal)) throw new BadRequestException('Canal inválido');
    if (canal !== 'empresa' && !['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'].includes(user.role))
      throw new ForbiddenException('Canal del equipo');
    if (canal === 'empresa' && (user.role !== 'EMPRESA' || !user.eeIds?.includes(eeId)))
      throw new ForbiddenException('No perteneces a esta empresa');
    const own = canal === 'empresa' ? eeId : 0;
    const other = canal === 'interno' ? 0 : otroEeId;
    if (!Number.isInteger(other) || other < 0 || (canal === 'staff' && !other) || (canal === 'empresa' && own === other))
      throw new BadRequestException('Conversación inválida');
    const ids = [own, other].filter(id => id > 0);
    if (ids.length && await this.prisma.empresaevento.count({ where: { id: { in: ids }, evento_id: eventoId, estaActivo: 1 } }) !== ids.length)
      throw new ForbiddenException('La conversación no pertenece a este evento');
    return { eventoId, own, other };
  }

  async visibles<T extends { id: number; emisorEe_id?: number; receptorEe_id?: number }>(userId: number, eventoId: number, canal: string, own: number, messages: T[]) {
    const views = await this.prisma.conversacionvista.findMany({ where: { usuario_id: userId, evento_id: eventoId, canal, propioEe_id: own, estaActivo: 1 } });
    const hidden = new Map(views.map(v => [v.otroEe_id, v.hastaMensajeId]));
    return messages.filter(m => m.id > (hidden.get(canal === 'interno' ? 0 : m.emisorEe_id === own ? m.receptorEe_id! : m.emisorEe_id!) ?? 0));
  }

  async borrarConversacion(user: any, body: { canal: string; eeId?: number; otroEeId: number }) {
    const { eventoId, own, other } = await this.contexto(user, body.canal, Number(body.eeId), Number(body.otroEeId));
    const where = body.canal === 'interno' ? { evento_id: eventoId } : {
      evento_id: eventoId, OR: [{ emisorEe_id: own, receptorEe_id: other }, { emisorEe_id: other, receptorEe_id: own }],
    };
    const last = body.canal === 'interno'
      ? await this.prisma.mensajeinterno.findFirst({ where: { evento_id: eventoId }, orderBy: { id: 'desc' } })
      : await this.prisma.mensajeempresa.findFirst({ where, orderBy: { id: 'desc' } });
    await this.prisma.conversacionvista.upsert({
      where: { usuario_id_evento_id_canal_propioEe_id_otroEe_id: { usuario_id: user.sub, evento_id: eventoId, canal: body.canal, propioEe_id: own, otroEe_id: other } },
      create: { usuario_id: user.sub, evento_id: eventoId, canal: body.canal, propioEe_id: own, otroEe_id: other, hastaMensajeId: last?.id ?? 0 },
      update: { hastaMensajeId: last?.id ?? 0, estaActivo: 1, creadoModificadoFecha: new Date() },
    });
    this.gateway.emitirParaUsuario(user.sub, 'mensajes:actualizados', { eventoId });
    return { ok: true };
  }

  async modificar(user: any, canal: string, id: number, contenido?: string) {
    const eventoId = await this.evento(user);
    if (!['empresa', 'interno'].includes(canal)) throw new BadRequestException('Canal inválido');
    const internal = canal === 'interno';
    if (internal && !['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'].includes(user.role))
      throw new ForbiddenException('Canal del equipo');
    const m = internal ? await this.prisma.mensajeinterno.findFirst({ where: { id, evento_id: eventoId, estaActivo: 1 } })
      : await this.prisma.mensajeempresa.findFirst({ where: { id, evento_id: eventoId, estaActivo: 1 } });
    if (!m) throw new BadRequestException('Mensaje no disponible');
    const author = internal ? (m as any).usuario_id : (m as any).remitenteUsuario_id ?? ((m as any).empresa_usuario_id
      ? (await this.prisma.empresa_usuario.findUnique({ where: { id: (m as any).empresa_usuario_id } }))?.usuario_id : null);
    if (author !== user.sub) throw new ForbiddenException('Solo puedes modificar tus propios mensajes');
    if (contenido !== undefined && (typeof contenido !== 'string' || !contenido.trim() || contenido.trim().length > 1000))
      throw new BadRequestException('Escribe entre 1 y 1000 caracteres');
    const data = contenido === undefined ? { estaActivo: 0 } : { contenido: contenido.trim(), fechaEdicion: new Date() };
    if (internal) await this.prisma.mensajeinterno.update({ where: { id }, data });
    else await this.prisma.mensajeempresa.update({ where: { id }, data });
    const payload = { id, eventoId };
    if (internal) this.gateway.emitirParaEvento(eventoId, 'chat-interno:actualizado', payload, true);
    else {
      for (const ee of [(m as any).emisorEe_id, (m as any).receptorEe_id]) {
        if (ee === 0) this.gateway.emitirParaEvento(eventoId, 'mensajes:actualizados', payload, true);
        else this.gateway.emitirParaEe(ee, 'mensajes:actualizados', payload);
      }
    }
    return { ok: true };
  }
}
