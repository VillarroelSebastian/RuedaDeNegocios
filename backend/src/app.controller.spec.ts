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
});
