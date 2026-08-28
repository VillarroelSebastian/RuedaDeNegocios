export const EVENT_TIME_ZONE = 'America/La_Paz';

export function fechaEvento(iso: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleString('es-BO', { timeZone: EVENT_TIME_ZONE, ...options });
}

export function horaEvento(iso: string | Date, hour12 = true): string {
  return fechaEvento(iso, { hour: '2-digit', minute: '2-digit', hour12 });
}

export function partesFechaEvento(iso: string | Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
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
