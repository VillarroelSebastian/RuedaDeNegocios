import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Put, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificacionesGateway } from './notificaciones.gateway.js';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly prisma: PrismaService, private readonly gateway: NotificacionesGateway) {}

  async evento(user: any) {
    if (!['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS', 'EMPRESA', 'FORO'].includes(user.role))
      throw new ForbiddenException('No tienes acceso a estas notificaciones');
    const event = await this.prisma.evento.findFirst({ where: { esPrincipal: 1, estaActivo: { not: 0 } } });
    if (!event) throw new BadRequestException('No hay evento activo');
    if (['EMPRESA', 'FORO'].includes(user.role) && !await this.prisma.empresa_usuario.findFirst({
      where: { usuario_id: user.sub, estaActivo: 1, empresaevento: { evento_id: event.id, estaActivo: 1 } },
    })) throw new ForbiddenException('No perteneces a este evento');
    return event.id;
  }

  @Get()
  async historial(@Req() req: any, completo = false) {
    const eventoId = await this.evento(req.user);
    const company = ['EMPRESA', 'FORO'].includes(req.user.role);
    const eeIds = req.user.eeIds ?? [];
    const base = req.user.role === 'ADMINISTRADOR' ? '/admin' : company ? '/empresa' : '/tecnico';
    const [news, ordinary, personal, reads] = await Promise.all([
      this.prisma.noticia.findMany({ where: { evento_id: eventoId, estaActivo: 1, estadoPublicacion: 'PUBLICADO', fechaHoraPublicacion: { lte: new Date() } } }),
      company ? this.prisma.notificacion.findMany({ where: { empresaevento_id: { in: eeIds }, empresaevento: { evento_id: eventoId }, estaActivo: 1, NOT: { tipoNotificacion: { startsWith: 'mensaje' } } } })
        : this.prisma.notificacionstaff.findMany({ where: { evento_id: eventoId, estaActivo: 1, NOT: { tipoNotificacion: { startsWith: 'mensaje' } } } }),
      this.prisma.notificacionpersonal.findMany({ where: { usuario_id: req.user.sub, estaActivo: 1, NOT: { tipoNotificacion: { startsWith: 'mensaje' } } } }),
      this.prisma.notificacionlectura.findMany({ where: { usuario_id: req.user.sub, evento_id: eventoId } }),
    ]);
    const readKeys = new Set(reads.map(r => r.clave));
    const noticiasIds = new Set(news.map(n => n.id));
    const normalize = (n: any, source: string) => ({
      id: `${source}-${n.id}`, titulo: n.tituloNotificacion, mensaje: n.mensajeNotificacion,
      tipo: n.tipoNotificacion, referenciaId: n.referenciaId, referenciaTipo: n.referenciaNombreTabla,
      fecha: n.fechaCreacion, urgente: !!n.urgente,
      enlace: n.referenciaNombreTabla === 'actividadprograma' ? `${base}/cronograma-vivo`
        : n.tipoNotificacion.startsWith('ticket') ? `${base}/mensajes`
        : n.referenciaNombreTabla === 'mesa' ? `${base}/mesas` : n.tipoNotificacion.startsWith('pago') ? `${base}/perfil`
        : n.tipoNotificacion.startsWith('solicitud') ? `${base}/solicitudes`
        : company ? `${base}/solicitudes?tab=reuniones&reunionId=${n.referenciaId}` : `${base}/virtuales`,
    });
    // Personal notifications outside this event are never included.
    const personalForEvent = personal.filter(n => n.referenciaNombreTabla === 'noticia' ? noticiasIds.has(n.referenciaId) : false);
    if (!company) {
      const mesas = await this.prisma.mesa.findMany({ where: { evento_id: eventoId }, select: { id: true } });
      const reuniones = await this.prisma.reunion.findMany({ where: { evento_id: eventoId }, select: { id: true } });
      const mesaIds = new Set(mesas.map(m => m.id)), reunionIds = new Set(reuniones.map(r => r.id));
      personalForEvent.push(...personal.filter(n => n.referenciaNombreTabla === 'mesa' ? mesaIds.has(n.referenciaId) : n.referenciaNombreTabla === 'reunion' && reunionIds.has(n.referenciaId)));
    }
    const items: any[] = [
      ...news.map(n => ({ id: `noticia-${n.id}`, titulo: n.tituloNoticia, mensaje: n.contenidoNoticia, urlImagen: n.urlImagenNoticia,
        tipo: n.tipoNoticia === 'COMUNICADO' ? 'comunicado:nuevo' : 'noticia:nueva', referenciaId: n.id, referenciaTipo: 'noticia',
        fecha: n.fechaHoraPublicacion, enlace: `/contenido/noticias/${n.id}` })),
      ...ordinary.map(n => normalize(n, company ? 'empresa' : 'staff')),
      ...personalForEvent.map(n => normalize(n, 'personal')),
    ];
    if (req.user.role === 'ADMINISTRADOR') {
      const pending = await this.prisma.empresaevento.findMany({ where: { evento_id: eventoId, estaActivo: 1, estadoVerificacionPago: { in: ['PENDIENTE', 'OBSERVADO'] } }, include: { empresa: true } });
      items.push(...pending.map(e => ({ id: `pago-${e.id}`, titulo: 'Pago pendiente de revisión', mensaje: `${e.empresa.nombre}: ${e.estadoVerificacionPago.toLowerCase()}`, tipo: 'pago:pendiente', fecha: e.fechaHoraEnvioComprobante ?? e.fechaCreacion, enlace: `/admin/pagos/${e.id}` })));
      const adicionales = await this.prisma.empresaeventocomprobantes.findMany({ where: { tipoPago: 'ADICIONAL', estadoPago: 'PENDIENTE', estaActivo: 1, empresaevento: { evento_id: eventoId } }, include: { empresaevento: { include: { empresa: true } } } });
      items.push(...adicionales.map(p => ({ id: `adicional-${p.id}`, titulo: 'Pago adicional pendiente', mensaje: p.empresaevento.empresa.nombre, tipo: 'pago:adicional', fecha: p.fechaCreacion, enlace: '/admin/pagos-adicionales' })));
    }
    for (const item of items) item.leida = readKeys.has(item.id);
    items.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return { eventoId, noLeidas: items.filter(n => !n.leida).length, notificaciones: completo ? items : items.slice(0, 100) };
  }

  @Put('leidas')
  async leer(@Req() req: any, @Body() body: { ids: string[] }) {
    if (!Array.isArray(body.ids) || body.ids.length > 100) throw new BadRequestException('Lista de notificaciones inválida');
    const feed = await this.historial(req, true);
    const allowed = new Set(feed.notificaciones.map(n => n.id));
    if (body.ids.some(id => !allowed.has(id))) throw new ForbiddenException('Notificación ajena o no disponible');
    await this.prisma.notificacionlectura.createMany({ data: [...new Set(body.ids)].map(clave => ({ usuario_id: req.user.sub, evento_id: feed.eventoId, clave })), skipDuplicates: true });
    this.gateway.emitirParaUsuario(req.user.sub, 'notificaciones:actualizadas', { eventoId: feed.eventoId });
    return { ok: true };
  }

  @Get('contenido/:id')
  async contenido(@Req() req: any, @Param('id') id: string) {
    const eventoId = await this.evento(req.user);
    const news = await this.prisma.noticia.findFirst({ where: { id: Number(id), evento_id: eventoId, estaActivo: 1, estadoPublicacion: 'PUBLICADO', fechaHoraPublicacion: { lte: new Date() } } });
    if (!news) throw new BadRequestException('La publicación no está disponible en este evento');
    return { id: news.id, titulo: news.tituloNoticia, contenido: news.contenidoNoticia, urlImagen: news.urlImagenNoticia, fecha: news.fechaHoraPublicacion, tipo: news.tipoNoticia };
  }
}
