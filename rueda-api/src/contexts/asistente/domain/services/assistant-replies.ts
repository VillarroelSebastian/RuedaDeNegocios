import { EVENT_TIME_ZONE, type TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import type {
  AssistantActivity,
  AssistantCompany,
  AssistantEnrollmentStatus,
  AssistantMeeting,
  AssistantNews,
} from '../models/assistant-view.js';

/** What the assistant answers with. `imageUrl` carries a picture when it has one. */
export interface AssistantReply {
  respuesta: string;
  imageUrl?: string;
}

const MISSING = '—';

/** Meetings happen at a place and an hour: they are read in the event's zone. */
export function eventDate(instant: Date | null): string {
  if (!instant) return MISSING;

  return instant.toLocaleDateString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function eventTime(instant: Date | null): string {
  if (!instant) return MISSING;

  return instant.toLocaleTimeString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The short form the booking conversation offers its slots in. */
export function slotLabel(instant: Date): string {
  const date = instant.toLocaleDateString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  const time = instant.toLocaleTimeString('es-BO', {
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${date} ${time}`;
}

/**
 * A programme day is a calendar day and its start is a room clock time — both
 * stored in UTC, so both are read back in UTC rather than in the event's zone.
 */
function calendarDay(day: Date): string {
  return day.toLocaleDateString('es-BO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function clockTime(time: Date): string {
  return `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
}

function numbered(lines: string[]): string {
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

function nameOf(company: AssistantCompany): string {
  const code = company.codigo ? ` (${company.codigo})` : '';
  const sector = company.rubro ? ` · ${company.rubro}` : '';

  return `${company.nombre}${code}${sector}`;
}

export function companiesReply(companies: AssistantCompany[]): AssistantReply {
  if (companies.length === 0) {
    return { respuesta: 'No hay empresas habilitadas en este evento.' };
  }

  return {
    respuesta: `Hay ${companies.length} empresa(s) habilitada(s):\n${numbered(companies.map(nameOf))}`,
  };
}

export function companyProfileReply(company: AssistantCompany): AssistantReply {
  const offer = company.oferta ? `\nOferta: ${company.oferta}` : '';
  const handle = company.codigo || company.nombre;

  return {
    respuesta: `${nameOf(company)}${offer}\n\nSi quieres reunirte con esta empresa, escribe "agendar reunión con ${handle}".`,
  };
}

export function companyNotFoundReply(term: string): AssistantReply {
  return {
    respuesta: `No encontré una empresa habilitada con el nombre o código "${term}" en este evento.`,
  };
}

function placeOf(meeting: AssistantMeeting): string {
  if (meeting.tipoReunion === 'VIRTUAL') return 'Virtual';

  return meeting.numeroMesa ? `Mesa ${meeting.numeroMesa}` : 'Mesa por confirmar';
}

export function meetingsReply(meetings: AssistantMeeting[]): AssistantReply {
  if (meetings.length === 0) {
    return { respuesta: 'No tienes reuniones aceptadas para este evento.' };
  }

  const lines = meetings.map(
    (meeting) =>
      `${eventDate(meeting.inicio)}, ${eventTime(meeting.inicio)} · ${meeting.contraparte || 'Empresa'} · ${placeOf(meeting)}`,
  );

  return {
    respuesta: `Tienes ${meetings.length} reunión(es) aceptada(s):\n${numbered(lines)}`,
  };
}

export function nextMeetingReply(meeting: AssistantMeeting | null): AssistantReply {
  if (!meeting) return { respuesta: 'No tienes reuniones programadas próximamente.' };

  const table = meeting.numeroMesa ? `Mesa ${meeting.numeroMesa}` : 'por confirmar';

  return {
    respuesta: `Tu próxima reunión es el ${eventDate(meeting.inicio)} a las ${eventTime(meeting.inicio)} con ${meeting.contraparte ?? 'desconocida'}. ${table}. Estado: ${meeting.estadoReunion}.`,
  };
}

export function tableReply(meeting: AssistantMeeting | null): AssistantReply {
  if (!meeting?.numeroMesa) {
    return { respuesta: 'Aún no tienes una mesa asignada para una reunión próxima.' };
  }

  return {
    respuesta: `Tu próxima mesa es la Mesa ${meeting.numeroMesa}, el ${eventDate(meeting.inicio)} a las ${eventTime(meeting.inicio)}.`,
  };
}

export function activitiesReply(activities: AssistantActivity[]): AssistantReply {
  if (activities.length === 0) {
    return { respuesta: 'Todavía no hay actividades publicadas para este evento.' };
  }

  const lines = activities.map(
    (activity) =>
      `${activity.nombreActividad} · ${calendarDay(activity.fechaActividad)} ${clockTime(activity.horaInicioActividad)} · ${activity.nombreSalaEspacio}`,
  );

  return { respuesta: `Estas son las actividades del evento:\n${numbered(lines)}` };
}

export function newsReply(news: AssistantNews[]): AssistantReply {
  if (news.length === 0) {
    return { respuesta: 'No hay comunicados publicados para este evento.' };
  }

  const lines = news.map((item) => `${item.tituloNoticia}: ${item.contenidoNoticia}`);

  return { respuesta: `Comunicados recientes:\n${numbered(lines)}` };
}

export function mapReply(mapUrl: string | null): AssistantReply {
  if (!mapUrl) {
    return {
      respuesta: 'El mapa del recinto aún no está disponible. Consulta con el administrador.',
    };
  }

  return { respuesta: 'Aquí tienes el mapa del recinto.', imageUrl: mapUrl };
}

export function talksReply(scheduleUrl: string | null): AssistantReply {
  if (!scheduleUrl) return { respuesta: 'El cronograma de charlas aún no está disponible.' };

  return { respuesta: 'Aquí tienes el cronograma de charlas del evento.', imageUrl: scheduleUrl };
}

export function datesReply(eventName: string, window: TimeWindow): AssistantReply {
  return {
    respuesta: `El evento "${eventName}" se realiza desde el ${eventDate(window.start)} a las ${eventTime(window.start)} hasta el ${eventDate(window.end)} a las ${eventTime(window.end)}.`,
  };
}

const PAYMENT_STATE: Record<string, string> = {
  COMPLETADO: 'aprobado',
  PENDIENTE: 'pendiente de verificación',
  RECHAZADO: 'rechazado',
  OBSERVADO: 'observado — revisar comentarios',
};

export function paymentReply(status: AssistantEnrollmentStatus | null): AssistantReply {
  const state = status?.estadoVerificacionPago ?? 'PENDIENTE';
  const amount = status?.montoPagado != null ? ` Monto registrado: Bs. ${status.montoPagado}.` : '';

  return {
    respuesta: `Tu inscripción corresponde al paquete ${status?.paqueteNombre ?? 'sin paquete identificado'}. Estado: ${PAYMENT_STATE[state] ?? state}.${amount}`,
  };
}

export function requestsReply(pending: number): AssistantReply {
  return {
    respuesta:
      pending > 0
        ? `Tienes ${pending} solicitud(es) de reunión pendiente(s). Revísalas en la sección Solicitudes.`
        : 'No tienes solicitudes de reunión pendientes.',
  };
}

export function seatsReply(status: AssistantEnrollmentStatus | null): AssistantReply {
  if (!status) return { respuesta: 'No se pudo obtener información de cupos.' };

  const left = Math.max(0, status.participantesTotales - status.participantesUsados);

  return {
    respuesta: `Tienes ${status.participantesUsados} participante(s) registrado(s) de ${status.participantesTotales} cupo(s) totales. Cupos disponibles: ${left}.`,
  };
}

export function helpReply(): AssistantReply {
  return {
    respuesta:
      'Elige una opción:\n1. Agendar una reunión\n2. Mi próxima reunión\n3. Todas mis reuniones aceptadas\n4. Mi próxima mesa\n5. Eventos y actividades\n6. Comunicados\n7. Fecha y horario del evento\n8. Solicitudes pendientes\n9. Cupos disponibles',
  };
}
