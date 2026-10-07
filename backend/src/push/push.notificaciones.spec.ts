import { jest } from '@jest/globals';
import { PushService } from './push.service.js';

function fixture() {
  const prisma: any = {
    evento: { findFirst: jest.fn(async () => ({ id: 3, esPrincipal: 1 })) },
    usuario: { findMany: jest.fn(async () => [{ id: 7, rolEvento: 'EMPRESA' }, { id: 8, rolEvento: 'FORO' }]) },
    pushsubscription: { findMany: jest.fn(async () => [{ id: 10, usuarioId: 7 }, { id: 11, usuarioId: 8 }]) },
    pushdelivery: { createMany: jest.fn(async () => ({ count: 2 })) },
  };
  const service = new PushService(prisma);
  service.procesar = jest.fn(async () => {});
  return { service, prisma };
}
describe('Notificaciones del dispositivo', () => {
  it.each(['noticia:nueva', 'comunicado:nuevo'])('encola %s con destino al artículo y el evento correcto', async tipo => {
    const { service, prisma } = fixture();
    await service.enviar('global', tipo, { titulo: 'Publicación', mensaje: 'Vista previa', referenciaId: 19, eventoId: 3 });
    const jobs = prisma.pushdelivery.createMany.mock.calls[0][0].data;
    expect(jobs).toHaveLength(2);
    expect(jobs[1].contenido.data).toMatchObject({ usuarioId: 8, eventoId: 3, referenciaId: 19, url: '/contenido/noticias/19' });
    expect(prisma.pushsubscription.findMany.mock.calls[0][0].where.estaActivo).toBe(1);
  });
  it('envía mensajes al apartado de mensajes y no duplica el aviso de sincronización', async () => {
    const { service, prisma } = fixture();
    await service.enviar(100, 'mensaje:staff', { titulo: 'Mensaje del equipo', mensaje: 'Hola', referenciaId: 30 });
    await service.enviar(100, 'mensaje:nuevo', { deEeId: 0 });
    expect(prisma.pushdelivery.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.pushdelivery.createMany.mock.calls[0][0].data[0].contenido.data.url).toBe('/empresa/mensajes');
    expect(prisma.usuario.findMany.mock.calls[0][0].where.empresa_usuario.some).toMatchObject({ empresaevento_id: 100, empresaevento: { evento_id: 3 } });
  });
  it('mantiene la entrega de los avisos normales de reuniones', async () => {
    const { service, prisma } = fixture();
    await service.enviar(100, 'reunion:recordatorio', { titulo: 'Reunión próxima', mensaje: 'Comienza en quince minutos', referenciaId: 30 });
    expect(prisma.pushdelivery.createMany.mock.calls[0][0].data[0].contenido.data.url).toBe('/empresa/solicitudes?tab=reuniones&reunionId=30');
  });
  it('no entrega publicaciones de un evento que dejó de estar activo', async () => {
    const { service, prisma } = fixture(); prisma.evento.findFirst.mockResolvedValueOnce({ id: 2, esPrincipal: 0 });
    await service.enviar('global', 'noticia:nueva', { titulo: 'Edición anterior', mensaje: 'Texto', referenciaId: 19, eventoId: 2 });
    expect(prisma.pushdelivery.createMany).not.toHaveBeenCalled();
  });
});
