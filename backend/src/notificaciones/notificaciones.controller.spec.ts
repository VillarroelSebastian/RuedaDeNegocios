import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller.js';

function fixture(role = 'EMPRESA') {
  const date = new Date('2026-10-07T12:00:00Z');
  const reads: any[] = [];
  const news = { id: 9, evento_id: 1, tituloNoticia: 'Noticia', contenidoNoticia: 'Vista previa', tipoNoticia: 'NOTICIA', urlImagenNoticia: '/imagen.png', fechaHoraPublicacion: date };
  const prisma: any = {
    evento: { findFirst: jest.fn(async () => ({ id: 1 })) },
    empresa_usuario: { findFirst: jest.fn(async () => ({ id: 70 })) },
    noticia: { findMany: jest.fn(async () => [news]), findFirst: jest.fn(async () => news) },
    notificacion: { findMany: jest.fn(async () => []) },
    notificacionstaff: { findMany: jest.fn(async () => []) },
    notificacionpersonal: { findMany: jest.fn(async () => []) },
    notificacionlectura: {
      findMany: jest.fn(async (args: any) => reads.filter(r => r.usuario_id === args.where.usuario_id)),
      createMany: jest.fn(async (args: any) => { reads.push(...args.data); return { count: args.data.length }; }),
    },
    mesa: { findMany: jest.fn(async () => []) }, reunion: { findMany: jest.fn(async () => []) },
  };
  const service = new NotificacionesController(prisma, { emitirParaUsuario: jest.fn() } as any);
  const req = { user: { sub: 7, role, eeIds: [10] } };
  return { service, prisma, req };
}
describe('Campanita del evento', () => {
  it.each(['EMPRESA', 'FORO', 'TECNICO'])('incluye publicaciones y vista previa para %s', async role => {
    const { service, req, prisma } = fixture(role); const feed = await service.historial(req);
    expect(feed.noLeidas).toBe(1);
    expect(feed.notificaciones[0]).toMatchObject({ titulo: 'Noticia', mensaje: 'Vista previa', referenciaId: 9, urlImagen: '/imagen.png', enlace: '/contenido/noticias/9', leida: false });
    expect(prisma.noticia.findMany.mock.calls[0][0].where).toMatchObject({ evento_id: 1, estaActivo: 1, estadoPublicacion: 'PUBLICADO' });
  });
  it('guarda la lectura solo para el usuario y evento actuales', async () => {
    const { service, req } = fixture(); await service.leer(req, { ids: ['noticia-9'] });
    expect((await service.historial(req)).noLeidas).toBe(0);
    expect((await service.historial({ user: { ...req.user, sub: 8 } })).noLeidas).toBe(1);
  });
  it('excluye mensajes del historial y contador', async () => {
    const { service, req, prisma } = fixture(); await service.historial(req);
    expect(prisma.notificacion.findMany.mock.calls[0][0].where.NOT).toEqual({ tipoNotificacion: { startsWith: 'mensaje' } });
  });
  it('rechaza marcar una notificación ajena', async () => {
    const { service, req } = fixture(); await expect(service.leer(req, { ids: ['empresa-999'] })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rechaza membresías de otro evento', async () => {
    const { service, req, prisma } = fixture(); prisma.empresa_usuario.findFirst.mockResolvedValueOnce(null);
    await expect(service.historial(req)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
