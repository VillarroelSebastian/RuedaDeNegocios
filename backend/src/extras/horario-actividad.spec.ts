import { accionCronograma, instanteActividad, ventanaActividad } from './horario-actividad.js';

// 14:30 hora de Bolivia = 18:30 UTC.
const fecha = new Date('2026-10-15T00:00:00.000Z');
const hora = (h: number, m: number) => new Date(Date.UTC(1970, 0, 1, h, m, 0));

describe('horario de actividades (hora de Bolivia)', () => {
  it('convierte la hora de pared de Bolivia a un instante UTC', () => {
    expect(new Date(instanteActividad(fecha, hora(14, 30))).toISOString()).toBe('2026-10-15T18:30:00.000Z');
  });

  it('una actividad que cruza la medianoche termina al día siguiente', () => {
    const v = ventanaActividad(fecha, hora(23, 0), hora(1, 0));
    expect(new Date(v.fin).toISOString()).toBe('2026-10-16T05:00:00.000Z');
  });

  const v = ventanaActividad(fecha, hora(14, 0), hora(15, 0)); // 18:00–19:00 UTC
  const ms = (iso: string) => new Date(iso).getTime();

  it('la inicia al llegar su hora y la finaliza al terminar', () => {
    expect(accionCronograma('PENDIENTE', false, v, ms('2026-10-15T18:00:20Z'))).toBe('INICIAR');
    expect(accionCronograma('EN_VIVO', false, v, ms('2026-10-15T18:30:00Z'))).toBe('NADA');
    expect(accionCronograma('EN_VIVO', false, v, ms('2026-10-15T19:00:00Z'))).toBe('FINALIZAR');
    expect(accionCronograma('EN_VIVO', true, v, ms('2026-10-15T19:00:00Z'))).toBe('FINALIZAR');
  });

  it('avisa 10 minutos antes y no antes', () => {
    expect(accionCronograma('PENDIENTE', false, v, ms('2026-10-15T17:49:00Z'))).toBe('NADA');
    expect(accionCronograma('PENDIENTE', false, v, ms('2026-10-15T17:51:00Z'))).toBe('RECORDAR');
  });

  it('respeta el cambio manual del staff y no toca las finalizadas', () => {
    expect(accionCronograma('PENDIENTE', true, v, ms('2026-10-15T18:10:00Z'))).toBe('NADA');
    expect(accionCronograma('FINALIZADA', false, v, ms('2026-10-15T18:10:00Z'))).toBe('NADA');
  });

  it('una actividad pendiente que ya pasó se marca finalizada', () => {
    expect(accionCronograma('PENDIENTE', false, v, ms('2026-10-15T20:00:00Z'))).toBe('FINALIZAR');
  });
});
