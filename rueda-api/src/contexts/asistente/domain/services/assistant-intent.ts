/**
 * What the company asked for. The assistant answers from rules, not from a
 * model, so the message is reduced to one of a closed set of intents.
 */
export type AssistantIntent =
  | { kind: 'companies' }
  | { kind: 'company-search'; term: string }
  | { kind: 'booking' }
  | { kind: 'meetings' }
  | { kind: 'next-meeting' }
  | { kind: 'table' }
  | { kind: 'activities' }
  | { kind: 'news' }
  | { kind: 'map' }
  | { kind: 'talks' }
  | { kind: 'dates' }
  | { kind: 'payment' }
  | { kind: 'requests' }
  | { kind: 'seats' }
  | { kind: 'help' };

/** Lower case and without accents: how every rule below expects to read it. */
export function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const COMPANIES = /(lista|listar|ver|mostrar|cuales|cuantas|todas)?\s*(las\s+)?empresas(\s+(participantes|registradas))?/;
const MEETING_WITH = /reunion con/;
const COMPANY_CODE = /\brb-[a-z0-9]+-\d+\b/;
const EXPLICIT_SEARCH =
  /(?:buscar|busca|encontrar|encuentra|datos de|informacion de)\s+(?:la\s+)?(?:empresa\s+)?(.+)$/;
const BOOKING = /(agendar|programar|solicitar|pedir)\s+(una\s+|otra\s+)?reunion|reunion con\s+\S+/;
const MEETING_LIST = /(todas|total|lista|listar|cuantas|mis)\s+(las\s+)?reuniones|reuniones\s+(aceptadas|agendadas|confirmadas)/;
const ANY_MEETING = /reunion|reunione|cuando me reun/;
const TABLE = /mesa|donde.*(reunion|me toca)|lugar.*reunion/;
const ACTIVITIES = /actividad|actividades|eventos|que va a haber/;
const NEWS = /comunicado|comunicados|noticia|noticias|aviso|avisos/;
const MAP = /mapa|recinto|ubicacion|donde es|donde esta/;
const TALKS = /cronograma|charla|conferencia|programa|agenda/;
const DATES = /fecha|cuando|horario|inicio|fin del evento/;
const PAYMENT = /pago|monto|inscripcion|precio|cuanto cuesta|cuanto es/;
const REQUESTS = /solicitud|pedido|pendiente/;
const SEATS = /cupo|participante|slot|espacio/;

/** Whether the message asks to arrange a meeting rather than to read about one. */
export function isBookingCommand(normalized: string): boolean {
  return BOOKING.test(normalized);
}

/**
 * The order matters and mirrors the legacy assistant: the broader rules are
 * tried last, so "mis reuniones" is a list and "cuando me reuno" is the next one.
 */
export function classifyIntent(message: string): AssistantIntent {
  const normalized = normalizeMessage(message);

  if (COMPANIES.test(normalized) && !MEETING_WITH.test(normalized)) return { kind: 'companies' };

  const term = COMPANY_CODE.exec(normalized)?.[0] ?? EXPLICIT_SEARCH.exec(normalized)?.[1]?.trim();
  if (term && !isBookingCommand(normalized)) return { kind: 'company-search', term };

  if (isBookingCommand(normalized)) return { kind: 'booking' };

  if (MEETING_LIST.test(normalized)) return { kind: 'meetings' };
  if (ANY_MEETING.test(normalized)) return { kind: 'next-meeting' };
  if (TABLE.test(normalized)) return { kind: 'table' };
  if (ACTIVITIES.test(normalized)) return { kind: 'activities' };
  if (NEWS.test(normalized)) return { kind: 'news' };
  if (MAP.test(normalized)) return { kind: 'map' };
  if (TALKS.test(normalized)) return { kind: 'talks' };
  if (DATES.test(normalized)) return { kind: 'dates' };
  if (PAYMENT.test(normalized)) return { kind: 'payment' };
  if (REQUESTS.test(normalized)) return { kind: 'requests' };
  if (SEATS.test(normalized)) return { kind: 'seats' };

  return { kind: 'help' };
}
