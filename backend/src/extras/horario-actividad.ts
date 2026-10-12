// Una actividad guarda su fecha (columna DATE) y sus horas de inicio/fin (columna
// TIME) como "hora de reloj de pared" del programa, es decir, la hora de Bolivia
// (UTC-4 todo el año, sin horario de verano) escrita tal cual. Para compararlas
// con el reloj real hay que convertirlas a un instante UTC sumando 4 horas.
export const OFFSET_BOLIVIA_HORAS = 4;
const DIA_MS = 24 * 60 * 60_000;

export function instanteActividad(fecha: Date, hora: Date): number {
  return Date.UTC(
    fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(),
    hora.getUTCHours() + OFFSET_BOLIVIA_HORAS, hora.getUTCMinutes(), hora.getUTCSeconds(),
  );
}

// Inicio y fin reales de una actividad; si termina "antes" de empezar (cruza la
// medianoche) el fin cae al día siguiente.
export function ventanaActividad(fecha: Date, horaInicio: Date, horaFin: Date): { inicio: number; fin: number } {
  const inicio = instanteActividad(fecha, horaInicio);
  let fin = instanteActividad(fecha, horaFin);
  if (fin <= inicio) fin += DIA_MS;
  return { inicio, fin };
}

export type AccionCronograma = 'INICIAR' | 'FINALIZAR' | 'RECORDAR' | 'NADA';

// Qué debe hacer el cronograma automático con una actividad en este momento.
export function accionCronograma(
  estadoEnVivo: string, manual: boolean, ventana: { inicio: number; fin: number }, ahora: number, minutosRecordatorio = 10,
): AccionCronograma {
  if (estadoEnVivo === 'EN_VIVO') return ahora >= ventana.fin ? 'FINALIZAR' : 'NADA';
  if (estadoEnVivo !== 'PENDIENTE' || manual) return 'NADA';
  if (ahora >= ventana.fin) return 'FINALIZAR';
  if (ahora >= ventana.inicio) return 'INICIAR';
  if (ventana.inicio - ahora <= minutosRecordatorio * 60_000) return 'RECORDAR';
  return 'NADA';
}
