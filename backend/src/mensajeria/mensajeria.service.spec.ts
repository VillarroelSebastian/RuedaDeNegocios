import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { MensajeriaService } from './mensajeria.service.js';

const user = { sub: 7, role: 'EMPRESA', eeIds: [10], euIds: [70] };
function fixture() {
  const views: any[] = [];
  let message: any = { id: 20, evento_id: 1, emisorEe_id: 10, receptorEe_id: 11, empresa_usuario_id: 70, estaActivo: 1, contenido: 'Hola' };
  const prisma: any = {
    evento: { findFirst: jest.fn(async () => ({ id: 1 })) },
    empresa_usuario: { findFirst: jest.fn(async () => ({ id: 70 })), findUnique: jest.fn(async () => ({ usuario_id: 7 })) },
    empresaevento: { count: jest.fn(async () => 2) },
    mensajeempresa: { findFirst: jest.fn(async () => message), update: jest.fn(async (args: any) => { message = { ...message, ...args.data }; return message; }) },
    mensajeinterno: { findFirst: jest.fn(async () => ({ id: 20, usuario_id: 7, estaActivo: 1 })), update: jest.fn(async () => ({})) },
    conversacionvista: {
      findMany: jest.fn(async (args: any) => views.filter(v => v.usuario_id === args.where.usuario_id)),
      upsert: jest.fn(async (args: any) => { views.push(args.create); return args.create; }),
    },
  };
  const gateway: any = { emitirParaUsuario: jest.fn(), emitirParaEe: jest.fn(), emitirParaEvento: jest.fn() };
  return { service: new MensajeriaService(prisma, gateway), prisma, gateway };
}
describe('Mensajería: permisos y borrado lógico por persona', () => {
  it('oculta el historial solo al usuario que elimina y permite que lleguen mensajes nuevos', async () => {
    const { service, prisma } = fixture();
    await service.borrarConversacion(user, { canal: 'empresa', eeId: 10, otroEeId: 11 });
    const old = { id: 20, emisorEe_id: 11, receptorEe_id: 10 }, fresh = { ...old, id: 21 };
    expect(await service.visibles(7, 1, 'empresa', 10, [old, fresh])).toEqual([fresh]);
    expect(await service.visibles(8, 1, 'empresa', 10, [old, fresh])).toEqual([old, fresh]);
    expect(prisma.mensajeempresa.update).not.toHaveBeenCalled();
    expect(prisma.conversacionvista.upsert.mock.calls[0][0].create.evento_id).toBe(1);
  });
  it('rechaza ocultar la conversación de otra empresa', async () => {
    await expect(fixture().service.borrarConversacion(user, { canal: 'empresa', eeId: 99, otroEeId: 11 })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('ocultar el canal interno no borra el historial de otros técnicos', async () => {
    const { service } = fixture();
    await service.borrarConversacion({ ...user, role: 'TECNICO' }, { canal: 'interno', otroEeId: 0 });
    const messages = [{ id: 20 }, { id: 21 }];
    expect(await service.visibles(7, 1, 'interno', 0, messages)).toEqual([{ id: 21 }]);
    expect(await service.visibles(8, 1, 'interno', 0, messages)).toEqual(messages);
  });
  it('rechaza conversaciones de otro evento', async () => {
    const { service, prisma } = fixture(); prisma.empresaevento.count.mockResolvedValueOnce(1);
    await expect(service.borrarConversacion(user, { canal: 'empresa', eeId: 10, otroEeId: 11 })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('registra la edición y emite cambios sin enviar una nueva notificación push', async () => {
    const { service, prisma, gateway } = fixture();
    await service.modificar(user, 'empresa', 20, '  Editado  ');
    expect(prisma.mensajeempresa.update).toHaveBeenCalledWith({ where: { id: 20 }, data: { contenido: 'Editado', fechaEdicion: expect.any(Date) } });
    expect(gateway.emitirParaEe.mock.calls[0][2]).not.toHaveProperty('titulo');
  });
  it('elimina lógicamente y conserva el registro del mensaje', async () => {
    const { service, prisma } = fixture(); await service.modificar(user, 'empresa', 20);
    expect(prisma.mensajeempresa.update).toHaveBeenCalledWith({ where: { id: 20 }, data: { estaActivo: 0 } });
  });
  it('rechaza editar mensajes ajenos', async () => {
    await expect(fixture().service.modificar({ ...user, sub: 8 }, 'empresa', 20, 'Suplantación')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(['', '   ', 'x'.repeat(1001)])('rechaza contenido inválido', async contenido => {
    await expect(fixture().service.modificar(user, 'empresa', 20, contenido)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('impide que una empresa acceda al chat interno', async () => {
    await expect(fixture().service.modificar(user, 'interno', 20, 'No')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rechaza al rol foro', async () => {
    await expect(fixture().service.evento({ ...user, role: 'FORO' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
