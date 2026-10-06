import { jest } from '@jest/globals';
import { AppController } from './app.controller.js';
import { ExtrasController } from './extras/extras.controller.js';

const fn = (value: any = null) => jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(value);
const evento = { id: 2, estaActivo: 1 };
const body = {
  evento_id: 2, nombreActividad: 'Taller', descripcionActividad: 'Descripcion',
  nombreSalaEspacio: 'Sala A', capacidadPersonasSala: 20,
  fechaActividad: '2026-10-06', horaInicioActividad: '14:00', horaFinActividad: '15:30',
  estadoActividad: 'Activo',
};

describe('Horarios y visibilidad de actividades', () => {
  it.each(['createActividad', 'updateActividad'])('%s conserva la hora ingresada sin desplazarla', async (method) => {
    const create = fn(), update = fn();
    const prisma = {
      evento: { findUnique: fn(evento) },
      actividadprograma: { create, update, findFirst: fn({ id: 1 }) },
    };
    const controller = new AppController({} as any, prisma as any, {} as any, {} as any) as any;
    controller.getPrincipalEvento = fn(evento);
    controller.fechasEvento = () => ['2026-10-06'];
    for (const inicio of ['00:00', '08:00', '14:00', '23:45']) {
      const data = { ...body, horaInicioActividad: inicio };
      if (method === 'createActividad') await controller.createActividad(data);
      else await controller.updateActividad('1', data);
      const saved = (method === 'createActividad' ? create : update).mock.calls.at(-1)![0].data;
      expect(saved.horaInicioActividad.toISOString()).toBe(`1970-01-01T${inicio}:00.000Z`);
      expect(saved.horaFinActividad.toISOString()).toBe('1970-01-01T15:30:00.000Z');
    }
  });

  it('el cronograma consulta solo actividades no eliminadas ni inactivas', async () => {
    const findMany = fn([]);
    const controller = new ExtrasController({
      evento: { findFirst: fn(evento) }, actividadprograma: { findMany },
    } as any, {} as any);
    expect(await controller.cronogramaVivo()).toMatchObject({ actividades: [], enVivo: [] });
    expect(findMany.mock.calls[0][0].where).toEqual({
      evento_id: 2, estaActivo: 1, estadoActividad: { not: 'Inactivo' },
    });
  });

  it('admin conserva las inactivas para poder reactivarlas', async () => {
    const findMany = fn([{ id: 1, estadoActividad: 'Inactivo' }]);
    const controller = new AppController({} as any, { actividadprograma: { findMany } } as any, {} as any, {} as any);
    expect(await controller.getActividades('2')).toHaveLength(1);
    expect(findMany.mock.calls[0][0].where).toEqual({ evento_id: 2, estaActivo: 1 });
  });

  it('una pantalla desactualizada no puede iniciar una actividad inactiva', async () => {
    const update = fn();
    const controller = new ExtrasController({ actividadprograma: {
      findUnique: fn({ id: 1, estaActivo: 1, estadoActividad: 'Inactivo' }), update,
    } } as any, {} as any);
    await expect(controller.cambiarEstadoEnVivo('1', { estadoEnVivo: 'EN_VIVO' })).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
});
