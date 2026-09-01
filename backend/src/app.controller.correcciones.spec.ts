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
