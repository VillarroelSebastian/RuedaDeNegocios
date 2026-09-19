import { Inject, Injectable, Logger } from '@nestjs/common';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { boliviaHourMinute } from '../../../../shared/domain/bolivia-time.js';
import { isDomainError } from '../../../../shared/domain/errors/domain.error.js';
import type { AssistantAnswer, BookingContext } from '../../domain/models/assistant-dialog.js';
import type { AssistantCompany } from '../../domain/models/assistant-view.js';
import { isBookingCommand, normalizeMessage } from '../../domain/services/assistant-intent.js';
import { slotLabel } from '../../domain/services/assistant-replies.js';
import {
  AUTOMATIC_TABLE,
  hourLabel,
  intervalLabel,
  pickCandidate,
  pickHour,
  pickMeetingType,
  pickPeriodHour,
  pickSlot,
  pickTable,
  readConfirmation,
  wantsToCancel,
} from '../../domain/services/booking-dialog.js';
import {
  AGENDA_SUGGESTIONS_PORT,
  type AgendaSuggestionsPort,
} from '../ports/agenda-suggestions.port.js';
import { COMPANY_DIRECTORY_PORT, type CompanyDirectoryPort } from '../ports/company-directory.port.js';
import { FREE_TABLES_PORT, type FreeTablesPort } from '../ports/free-tables.port.js';
import { MEETING_BOOKING_PORT, type MeetingBookingPort } from '../ports/meeting-booking.port.js';

export interface BookingTurn {
  companyEventId: number;
  companyUserId: number;
  eventId: number;
  mensaje: string;
  contexto?: BookingContext | null;
}

/** A counterpart, reduced to what the conversation needs to talk about it. */
interface Counterpart {
  empresaeventoId: number;
  nombre: string;
}

const BOOKING_WITH = /reunion con\s+(.+)$/;
/** Twelve slots is a readable list; the rest is offered on a later turn. */
const MAX_SLOTS_SHOWN = 12;
const MAX_TABLES_SHOWN = 8;
const DEFAULT_DURATION_MINUTES = 20;
const SENT_FROM_ASSISTANT = 'Solicitud enviada desde el asistente virtual';
const YES_OR_NO = ['Sí, enviar', 'No, cancelar'];

/** Where the conversation goes back to when its state no longer adds up. */
const RESTART: AssistantAnswer = {
  respuesta: '¿Con qué empresa quieres agendar la reunión? Escribe su nombre.',
  contexto: { flujo: 'agendar', paso: 'empresa' },
};

/**
 * The context makes a round trip through the client, so a step may arrive
 * without what it needs. Rather than booking with half an answer, start over.
 */
function isBookable(context: BookingContext): boolean {
  return Boolean(context.receptoraEeId) && !Number.isNaN(Date.parse(context.inicio ?? ''));
}

function numbered(lines: string[]): string {
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

function labelled(company: AssistantCompany): string {
  return `${company.nombre}${company.codigo ? ` (${company.codigo})` : ''}`;
}

function asCandidates(companies: AssistantCompany[]) {
  return companies.map((company) => ({
    id: company.empresaeventoId,
    nombre: company.nombre,
    codigo: company.codigo,
  }));
}

function slotDates(context: BookingContext): Date[] {
  return (context.slots ?? []).map((slot) => new Date(slot));
}

/**
 * Walks a company through booking a meeting, one message at a time.
 *
 * The server keeps nothing between two messages: the state of the conversation
 * travels in `contexto`. Nothing it carries is trusted — the request is created
 * by the requests context, which re-checks the counterpart, the slot and the
 * table before anything is written.
 */
@Injectable()
export class BookingConversation {
  private readonly logger = new Logger(BookingConversation.name);

  constructor(
    @Inject(COMPANY_DIRECTORY_PORT) private readonly companies: CompanyDirectoryPort,
    @Inject(AGENDA_SUGGESTIONS_PORT) private readonly agenda: AgendaSuggestionsPort,
    @Inject(FREE_TABLES_PORT) private readonly tables: FreeTablesPort,
    @Inject(MEETING_BOOKING_PORT) private readonly bookings: MeetingBookingPort,
  ) {}

  /** `null` when the message is not about booking, so the assistant answers it. */
  async advance(turn: BookingTurn): Promise<AssistantAnswer | null> {
    const inFlow = turn.contexto?.flujo === 'agendar';
    if (!inFlow && !isBookingCommand(normalizeMessage(turn.mensaje))) return null;

    if (inFlow && wantsToCancel(turn.mensaje)) {
      return { respuesta: 'Listo, cancelé el agendamiento. ¿Te ayudo con algo más?', contexto: null };
    }

    if (!turn.contexto || !inFlow) return this.start(turn);

    switch (turn.contexto.paso) {
      case 'empresa':
        return this.chooseCompany(turn, turn.contexto);
      case 'hora':
        return this.chooseHour(turn, turn.contexto);
      case 'periodo':
        return this.choosePeriod(turn, turn.contexto);
      case 'horario':
        return this.chooseSlot(turn, turn.contexto);
      case 'tipo':
        return this.chooseType(turn, turn.contexto);
      case 'mesa':
        return this.chooseTable(turn, turn.contexto);
      case 'confirmar':
        return this.confirm(turn, turn.contexto);
      default:
        return RESTART;
    }
  }

  private async start(turn: BookingTurn): Promise<AssistantAnswer> {
    const term = BOOKING_WITH.exec(normalizeMessage(turn.mensaje))?.[1]?.trim();
    if (term) return this.search(turn, term);

    const bookable = await this.companies.listBookable(turn.eventId, turn.companyEventId, '');
    if (bookable.length === 0) {
      return {
        respuesta: 'No hay otras empresas habilitadas para agendar en este evento.',
        contexto: { flujo: 'agendar', paso: 'empresa' },
        opciones: ['Cancelar agendamiento'],
      };
    }

    const opciones = bookable.map((company) => company.nombre);
    return {
      respuesta: `Elige una empresa:\n${numbered(opciones)}\n\nTambién puedes escribir el nombre de otra empresa o "cancelar".`,
      contexto: { flujo: 'agendar', paso: 'empresa', candidatos: asCandidates(bookable) },
      opciones,
    };
  }

  private async search(turn: BookingTurn, term: string): Promise<AssistantAnswer> {
    const found = await this.companies.listBookable(turn.eventId, turn.companyEventId, term);

    if (found.length === 0) {
      return {
        respuesta: `No encontré ninguna empresa habilitada que se llame "${term}". Escribe otro nombre o "cancelar".`,
        contexto: { flujo: 'agendar', paso: 'empresa' },
      };
    }
    if (found.length === 1) return this.offerSlots(turn, found[0]!);

    return {
      respuesta: `Encontré varias empresas:\n${numbered(found.map(labelled))}\n\n¿Cuál eliges? Responde con el número, el nombre o el código.`,
      contexto: { flujo: 'agendar', paso: 'empresa', candidatos: asCandidates(found) },
      opciones: found.map((company) => company.nombre),
    };
  }

  private async offerSlots(turn: BookingTurn, counterpart: Counterpart): Promise<AssistantAnswer> {
    const agenda = await this.agenda.listFreeSlots(turn.companyEventId, counterpart.empresaeventoId);

    if (agenda.slots.length === 0) {
      return {
        respuesta: `${counterpart.nombre} no tiene horarios disponibles por ahora. Intenta más tarde o escribe el nombre de otra empresa.`,
        contexto: { flujo: 'agendar', paso: 'empresa' },
      };
    }

    const shown = agenda.slots.slice(0, MAX_SLOTS_SHOWN);
    const opciones = shown.map(slotLabel);
    const later = agenda.slots.length - shown.length;
    const more =
      later > 0 ? ` Hay ${later} horarios posteriores que podrás consultar si estos no te sirven.` : '';

    return {
      respuesta: `Estos son los próximos horarios realmente disponibles con ${counterpart.nombre}:\n${numbered(opciones)}\n\nElige un número.${more}`,
      contexto: {
        flujo: 'agendar',
        paso: 'horario',
        receptoraEeId: counterpart.empresaeventoId,
        receptoraNombre: counterpart.nombre,
        slots: shown.map((slot) => slot.toISOString()),
        horarioOpciones: opciones,
        duracionMin: agenda.duracionMinutos,
      },
      opciones,
    };
  }

  private async chooseCompany(
    turn: BookingTurn,
    context: BookingContext,
  ): Promise<AssistantAnswer> {
    const candidates = context.candidatos ?? [];
    const asked = normalizeMessage(turn.mensaje).trim();

    if (candidates.length === 0) return this.search(turn, asked);

    const chosen = pickCandidate(turn.mensaje, candidates);
    if (chosen) {
      return this.offerSlots(turn, { empresaeventoId: chosen.id, nombre: chosen.nombre });
    }

    // A name that is not on the list is a new search, not a mistake.
    if (asked && Number.isNaN(Number.parseInt(asked, 10))) return this.search(turn, asked);

    return {
      respuesta:
        'No entendí cuál empresa. Responde con el número de la lista, el nombre exacto, o "cancelar".',
      contexto: context,
      opciones: candidates.map((candidate) => candidate.nombre),
    };
  }

  private chooseHour(turn: BookingTurn, context: BookingContext): AssistantAnswer {
    const slots = slotDates(context);
    const choice = pickHour(turn.mensaje, slots);

    if (choice.kind === 'unreadable') {
      return { respuesta: 'Indica una hora, por ejemplo "1", "9 a. m." o "3 p. m.".', contexto: context };
    }
    if (choice.kind === 'unavailable') {
      return {
        respuesta: 'Esa hora no está disponible. Indica otra hora dentro del horario mostrado.',
        contexto: context,
      };
    }
    if (choice.kind === 'ambiguous') {
      const opciones = choice.hours.map((hour) =>
        hourLabel(slots.find((slot) => boliviaHourMinute(slot).hour === hour)!),
      );

      return {
        respuesta: `Hay disponibilidad en ambos horarios. ¿Cuál prefieres?\n${numbered(opciones)}`,
        contexto: { ...context, paso: 'periodo', horas: choice.hours },
        opciones,
      };
    }

    return this.offerIntervals(context, slots, choice.hour);
  }

  private choosePeriod(turn: BookingTurn, context: BookingContext): AssistantAnswer {
    const hour = pickPeriodHour(turn.mensaje, context.horas ?? []);
    if (hour == null) return { respuesta: 'Elige la opción de la mañana o de la tarde.', contexto: context };

    return this.offerIntervals(context, slotDates(context), hour);
  }

  private offerIntervals(context: BookingContext, slots: Date[], hour: number): AssistantAnswer {
    const matching = slots.filter((slot) => boliviaHourMinute(slot).hour === hour);
    const opciones = matching.map(intervalLabel);

    return {
      respuesta: `Elige un intervalo disponible:\n${numbered(opciones)}`,
      contexto: {
        ...context,
        paso: 'horario',
        slots: matching.map((slot) => slot.toISOString()),
        horarioOpciones: opciones,
      },
      opciones,
    };
  }

  private chooseSlot(turn: BookingTurn, context: BookingContext): AssistantAnswer {
    const chosen = pickSlot(turn.mensaje, slotDates(context), context.horarioOpciones ?? []);

    if (!chosen) {
      return {
        respuesta: 'No reconocí ese horario. Responde con el número de la lista (ej: 1) o toca una opción.',
        contexto: context,
        opciones: context.horarioOpciones,
      };
    }

    return {
      respuesta: `Perfecto: ${slotLabel(chosen)} con ${context.receptoraNombre}. ¿La reunión será presencial o virtual?`,
      contexto: { ...context, paso: 'tipo', inicio: chosen.toISOString() },
      opciones: ['Presencial', 'Virtual'],
    };
  }

  private async chooseType(turn: BookingTurn, context: BookingContext): Promise<AssistantAnswer> {
    if (!isBookable(context)) return RESTART;

    const tipo = pickMeetingType(turn.mensaje);
    if (!tipo) {
      return {
        respuesta: '¿La reunión será presencial o virtual?',
        contexto: context,
        opciones: ['Presencial', 'Virtual'],
      };
    }

    if (tipo === 'VIRTUAL') {
      return {
        respuesta: `${this.summary(context, tipo, null)}\n\n¿Envío la solicitud?`,
        contexto: { ...context, paso: 'confirmar', tipo, mesaId: null },
        opciones: YES_OR_NO,
      };
    }

    const free = await this.tables.listFree(windowOf(context));
    const tables = free.slice(0, MAX_TABLES_SHOWN);

    if (tables.length === 0) {
      return {
        respuesta: `No encontré mesas libres para ese horario en este momento, pero puedo intentar asignarte una automáticamente al confirmar.\n\n${this.summary(context, tipo, null)}\n\n¿Envío la solicitud?`,
        contexto: { ...context, paso: 'confirmar', tipo, mesaId: null },
        opciones: YES_OR_NO,
      };
    }

    const mesaOpciones = [...tables.map((table) => `Mesa ${table.numeroMesa}`), AUTOMATIC_TABLE];
    return {
      respuesta: `¿En qué mesa prefieres la reunión presencial?\n${numbered(mesaOpciones)}`,
      contexto: { ...context, paso: 'mesa', tipo, mesas: tables, mesaOpciones },
      opciones: mesaOpciones,
    };
  }

  private chooseTable(turn: BookingTurn, context: BookingContext): AssistantAnswer {
    if (!isBookable(context)) return RESTART;

    const choice = pickTable(turn.mensaje, context.mesas ?? [], context.mesaOpciones ?? []);

    if (choice.kind === 'unreadable') {
      return {
        respuesta: 'No reconocí esa mesa. Responde con el número de la lista o toca una opción.',
        contexto: context,
        opciones: context.mesaOpciones,
      };
    }

    const mesaId = choice.kind === 'automatic' ? null : choice.tableId;
    return {
      respuesta: `${this.summary(context, 'PRESENCIAL', mesaId)}\n\n¿Envío la solicitud?`,
      contexto: { ...context, paso: 'confirmar', mesaId },
      opciones: YES_OR_NO,
    };
  }

  private async confirm(turn: BookingTurn, context: BookingContext): Promise<AssistantAnswer> {
    if (!isBookable(context)) return RESTART;

    const decision = readConfirmation(turn.mensaje);
    if (decision === 'cancel') {
      return { respuesta: 'Solicitud cancelada. ¿Te ayudo con algo más?', contexto: null };
    }
    if (decision === 'unclear') {
      return {
        respuesta: 'Responde "sí" para enviar la solicitud o "no" para cancelar.',
        contexto: context,
        opciones: YES_OR_NO,
      };
    }

    try {
      await this.bookings.request({
        solicitanteId: turn.companyEventId,
        receptoraId: context.receptoraEeId!,
        companyUserId: turn.companyUserId,
        tipoReunion: context.tipo ?? 'PRESENCIAL',
        window: windowOf(context),
        mesaId: context.mesaId ?? null,
        mensaje: SENT_FROM_ASSISTANT,
      });
    } catch (error) {
      // Only the domain speaks to the company; anything else stays in the log.
      if (!isDomainError(error)) {
        this.logger.warn(`Assistant booking failed for enrollment ${turn.companyEventId}: ${String(error)}`);
      }
      const reason = isDomainError(error) ? error.message : 'error desconocido';

      return {
        respuesta: `No pude crear la solicitud: ${reason}. Escribe "agendar reunión" para intentar con otro horario.`,
        contexto: null,
      };
    }

    return {
      respuesta: `¡Listo! Envié la solicitud de reunión a ${context.receptoraNombre} para el ${slotLabel(new Date(context.inicio!))}. Te avisaré cuando respondan; puedes ver el estado en la sección Solicitudes.`,
      contexto: null,
    };
  }

  private summary(
    context: BookingContext,
    tipo: 'PRESENCIAL' | 'VIRTUAL',
    mesaId: number | null,
  ): string {
    const when = slotLabel(new Date(context.inicio!));
    if (tipo === 'VIRTUAL') {
      return `Resumen de tu solicitud:\n• Empresa: ${context.receptoraNombre}\n• Horario: ${when}\n• Tipo: Virtual`;
    }

    const table =
      mesaId === null
        ? 'se asignará automáticamente'
        : `Mesa ${context.mesas?.find((candidate) => candidate.id === mesaId)?.numeroMesa}`;

    return `Resumen de tu solicitud:\n• Empresa: ${context.receptoraNombre}\n• Horario: ${when}\n• Tipo: Presencial\n• Mesa: ${table}`;
  }
}

/** The window the meeting would take, from the slot and the event's duration. */
function windowOf(context: BookingContext): TimeWindow {
  const start = new Date(context.inicio!);
  const minutes = Number(context.duracionMin) || DEFAULT_DURATION_MINUTES;

  return { start, end: new Date(start.getTime() + minutes * 60000) };
}
