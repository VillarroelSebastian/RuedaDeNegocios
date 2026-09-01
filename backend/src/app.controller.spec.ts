import { AppController } from './app.controller.js';

describe('AppController - jornadas de reuniones', () => {
  const controller = new AppController({} as any, {} as any, {} as any, {} as any) as any;

  it('incluye ambas fechas de un evento configurado como rango de fechas', () => {
    const evento = {
      fechaInicioEvento: new Date('2026-11-13T00:00:00.000Z'),
      fechaFinEvento: new Date('2026-11-14T00:00:00.000Z'),
      duracionReunion: 20,
      tiempoEntreReuniones: 15,
    };

    expect(controller.fechasEvento(evento)).toEqual(['2026-11-13', '2026-11-14']);
    const slots = controller.generarCandidatosInicio(evento);
    expect(slots.some((slot: any) => slot.inicio.toISOString().startsWith('2026-11-13'))).toBe(true);
    expect(slots.some((slot: any) => slot.inicio.toISOString().startsWith('2026-11-14'))).toBe(true);
  });

  it('mantiene las horas explícitas de un evento configurado con fecha y hora', () => {
    const evento = {
      fechaInicioEvento: new Date('2026-11-13T13:00:00.000Z'),
      fechaFinEvento: new Date('2026-11-14T22:00:00.000Z'),
      duracionReunion: 20,
      tiempoEntreReuniones: 15,
    };

    expect(controller.fechasEvento(evento)).toEqual(['2026-11-13', '2026-11-14']);
    const ventanas = controller.ventanasDiariasReunionesEvento(evento);
    expect(ventanas[0].start.toISOString()).toBe('2026-11-13T13:00:00.000Z');
    expect(ventanas[1].end.toISOString()).toBe('2026-11-14T22:00:00.000Z');
  });

  it('respeta exactamente los rangos diarios y el descanso definidos por el admin', () => {
    const evento = {
      fechaInicioEvento: new Date('2026-09-01T12:00:00.000Z'),
      fechaFinEvento: new Date('2026-09-01T18:00:00.000Z'),
      duracionReunion: 20,
      tiempoEntreReuniones: 5,
      horariosReunionJson: JSON.stringify([
        { fecha: '2026-09-01', habilitado: true, rangos: [{ desde: '08:00', hasta: '10:00' }] },
      ]),
    };
    const slots = controller.generarFranjas(evento);
    expect(slots.map((slot: any) => slot.inicio.toISOString())).toEqual([
      '2026-09-01T12:00:00.000Z',
      '2026-09-01T12:25:00.000Z',
      '2026-09-01T12:50:00.000Z',
      '2026-09-01T13:15:00.000Z',
      '2026-09-01T13:40:00.000Z',
    ]);
    expect(slots.at(-1).fin.toISOString()).toBe('2026-09-01T14:00:00.000Z');
  });
});
