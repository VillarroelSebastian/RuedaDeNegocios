import { AppController } from './app.controller.js';
import { jest } from '@jest/globals';

describe('AppController - validación de correos de técnicos', () => {
  it('rechaza el correo de un participante aunque su usuario esté inactivo', async () => {
    const prisma = {
      usuario: {
        findMany: jest.fn().mockResolvedValue([{ rolEvento: 'EMPRESA', estaActivo: 0 }]),
      },
    };
    const controller = new AppController({} as any, prisma as any, {} as any, {} as any) as any;

    await expect(controller.validarCorreoDisponibleParaTecnico('persona@correo.com')).rejects.toThrow(
      'El correo pertenece a un usuario registrado',
    );
  });

  it('permite reutilizar un registro inactivo que ya era técnico', async () => {
    const prisma = {
      usuario: {
        findMany: jest.fn().mockResolvedValue([{ rolEvento: 'TECNICO', estaActivo: 0 }]),
      },
    };
    const controller = new AppController({} as any, prisma as any, {} as any, {} as any) as any;

    await expect(controller.validarCorreoDisponibleParaTecnico('tecnico@correo.com')).resolves.toBeUndefined();
  });
});

describe('AppController - resumen operativo de empresa', () => {
  it('aplica el evento y sus fechas a los contadores del dashboard', async () => {
    const evento = {
      id: 9,
      fechaInicioEvento: new Date('2026-08-29T12:30:00.000Z'),
      fechaFinEvento: new Date('2026-08-30T22:00:00.000Z'),
    };
    const reunionCount = jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    const prisma = {
      evento: { findFirst: jest.fn().mockResolvedValue({ id: evento.id }) },
      empresaevento: { findFirst: jest.fn().mockResolvedValue({ id: 58, evento }) },
      solicitudreunion: { count: jest.fn().mockResolvedValue(0) },
      reunion: { count: reunionCount, findFirst: jest.fn().mockResolvedValue(null) },
      noticia: { findMany: jest.fn().mockResolvedValue([]) },
      actividadprograma: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const controller = new AppController({} as any, prisma as any, {} as any, {} as any) as any;

    const resultado = await controller.getEmpresaDashboardStats('58');

    expect(resultado.reunionesTotal).toBe(3);
    expect(resultado.proximaReunion).toBeNull();
    for (const [args] of reunionCount.mock.calls) {
      expect(args.where.AND[0]).toMatchObject({
        evento_id: evento.id,
        fechaHoraInicioReunion: { gte: evento.fechaInicioEvento },
        fechaHoraFinReunion: { lte: evento.fechaFinEvento },
      });
    }
  });
});

describe('AppController - alcance operativo de actividades', () => {
  const evento = {
    id: 9,
    fechaInicioEvento: new Date('2026-08-29T12:30:00.000Z'),
    fechaFinEvento: new Date('2026-08-31T03:59:00.000Z'),
    horariosReunionJson: null,
  };

  it('limita el cronograma a las fechas locales configuradas del evento', () => {
    const controller = new AppController({} as any, {} as any, {} as any, {} as any) as any;

    expect(controller.filtroActividadOperativa(evento)).toEqual({
      evento_id: 9,
      estaActivo: 1,
      fechaActividad: {
        gte: new Date('2026-08-29T00:00:00.000Z'),
        lte: new Date('2026-08-30T23:59:59.999Z'),
      },
    });
  });

  it('rechaza una actividad fuera de los días del evento', () => {
    const controller = new AppController({} as any, {} as any, {} as any, {} as any) as any;

    expect(() => controller.validarFechaActividad(evento, '2026-08-28')).toThrow(
      'La fecha de la actividad debe estar dentro de las fechas del evento.',
    );
    expect(() => controller.validarFechaActividad(evento, '2026-08-30')).not.toThrow();
  });
});

describe('AppController - agenda con rangos personalizados', () => {
  it('valida al guardar con la misma grilla que mostró al usuario y conserva la pausa de mesa', async () => {
    const inicio = new Date('2099-09-08T22:40:00.000Z'); // 18:40 en Bolivia
    const fin = new Date('2099-09-08T23:00:00.000Z');
    const evento = {
      fechaInicioSolicitudes: null,
      fechaFinSolicitudes: new Date('2099-09-09T00:00:00.000Z'),
      fechaInicioEvento: new Date('2099-09-08T12:00:00.000Z'),
      fechaFinEvento: new Date('2099-09-09T00:00:00.000Z'),
      duracionReunion: 20,
      tiempoEntreReuniones: 5,
      horariosReunionJson: JSON.stringify([{
        fecha: '2099-09-08', habilitado: true,
        rangos: [{ desde: '09:00', hasta: '12:30' }, { desde: '14:30', hasta: '20:00' }],
      }]),
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ locked: 1 }]),
      reunion: { findFirst: jest.fn().mockResolvedValue(null) },
      solicitudreunion: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 77 }),
      },
    };
    const prisma = {
      evento: { findFirst: jest.fn(), findUnique: jest.fn().mockResolvedValue(evento) },
      empresa_usuario: { findFirst: jest.fn().mockResolvedValue({ id: 3 }) },
      solicitudreunion: { findFirst: jest.fn().mockResolvedValue(null) },
      mesa: { findFirst: jest.fn().mockResolvedValue({ id: 16 }) },
      empresaevento: { findUnique: jest.fn().mockResolvedValue({ empresa: { nombre: 'Empresa A' } }) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const controller = new AppController({} as any, prisma as any, {} as any, {} as any) as any;
    jest.spyOn(controller, 'getPrincipalEventoId').mockResolvedValue(11);
    jest.spyOn(controller, 'verificarEE').mockResolvedValue(undefined);
    jest.spyOn(controller, 'getHorariosDisponibles').mockResolvedValue({
      agenda: [{ inicio: inicio.toISOString(), fin: fin.toISOString(), disponible: true }],
    });
    jest.spyOn(controller, 'notificar').mockResolvedValue(undefined);

    await expect(controller.crearSolicitud({
      eeId: 1, eeReceptoraId: 2, euId: 3, tipo: 'PRESENCIAL',
      inicio: inicio.toISOString(), fin: fin.toISOString(), mesaId: 16,
    })).resolves.toMatchObject({ id: 77, mesaId: 16 });

    expect(prisma.evento.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ horariosReunionJson: true }),
    }));
    expect(tx.reunion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      fechaHoraInicioReunion: { lt: new Date('2099-09-08T23:05:00.000Z') },
      fechaHoraFinReunion: { gt: new Date('2099-09-08T22:35:00.000Z') },
    }) }));
  });
});

describe('AppController - oportunidades priorizadas', () => {
  it('evita devolver todas las combinaciones posibles y mantiene crecimiento lineal', async () => {
    const inscripciones = Array.from({ length: 200 }, (_, indice) => ({
      id: indice + 1,
      empresa: {
        nombre: `Empresa ${String(indice + 1).padStart(3, '0')}`,
        codigo: `RB-EMP-${indice + 1}`,
        rubro: 'Energía y Tecnología',
        oferta: 'Servicios de software empresarial',
        demanda: 'Servicios de software empresarial',
        interesesBusqueda: 'Energía y Tecnología',
      },
    }));
    const prisma = {
      evento: { findFirst: jest.fn().mockResolvedValue({ id: 9 }) },
      empresaevento: { findMany: jest.fn().mockResolvedValue(inscripciones) },
    };
    const controller = new AppController({} as any, prisma as any, {} as any, {} as any) as any;
    const evaluar = jest.spyOn(controller, 'evaluarParejaOportunidad');

    const resultado = await controller.getOportunidadesStaff();

    expect(resultado).toHaveLength(200);
    expect(new Set(resultado.map((item: any) => `${item.empresaA.empresaeventoId}-${item.empresaB.empresaeventoId}`)).size)
      .toBe(resultado.length);
    expect(evaluar.mock.calls.length).toBeLessThanOrEqual(200 * 32);
    expect(evaluar.mock.calls.length).toBeLessThan((200 * 199) / 2);
  });

  it('normaliza tildes y descarta palabras demasiado genéricas de menos de cuatro letras', () => {
    const controller = new AppController({} as any, {} as any, {} as any, {} as any) as any;

    expect(controller.palabrasOportunidad('Tecnología, logística y café')).toEqual(['tecnologia', 'logistica', 'cafe']);
    expect(controller.hayCoincidenciaTexto('Soluciones de tecnología', 'Tecnologia financiera')).toBe(true);
  });
});
