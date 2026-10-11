export const EVENT_TIME_ZONE = 'America/La_Paz';

// toLocaleString construye un formateador nuevo en cada llamada, y estas
// funciones se usan varias veces por fila en listas largas (las franjas de la
// agenda, por ejemplo). Se guarda uno por combinación de opciones: es el mismo
// resultado, sin rehacer el trabajo caro en cada render.
const formateadores = new Map<string, Intl.DateTimeFormat>();
function formateadorCon(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const clave = JSON.stringify(options);
  let f = formateadores.get(clave);
  if (!f) {
    f = new Intl.DateTimeFormat('es-BO', { timeZone: EVENT_TIME_ZONE, ...options });
    formateadores.set(clave, f);
  }
  return f;
}

export function fechaEvento(iso: string | Date, options: Intl.DateTimeFormatOptions): string {
  return formateadorCon(options).format(new Date(iso));
}

export function horaEvento(iso: string | Date, hour12 = true): string {
  return fechaEvento(iso, { hour: '2-digit', minute: '2-digit', hour12 });
}

// Construir un Intl.DateTimeFormat es caro y esta función se llama una vez por
// franja horaria en cada render: con la agenda completa del evento eran cientos
// de construcciones por toque, y la pantalla de solicitar reunión se volvía
// lenta y perdía pulsaciones. El formateador no cambia nunca, así que se crea
// una sola vez.
let formateadorPartes: Intl.DateTimeFormat | null = null;
function obtenerFormateador(): Intl.DateTimeFormat {
  if (!formateadorPartes) {
    formateadorPartes = new Intl.DateTimeFormat('en-CA', {
      timeZone: EVENT_TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  }
  return formateadorPartes;
}

export function partesFechaEvento(iso: string | Date) {
  const parts = obtenerFormateador().formatToParts(new Date(iso));
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = value('hour');
  const minute = value('minute');
  return {
    year, month, day, hour, minute,
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}
