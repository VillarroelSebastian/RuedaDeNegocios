import type { BookingCandidate } from '../services/booking-dialog.js';
import type { AssistantTable } from './assistant-view.js';

export type BookingStep = 'empresa' | 'hora' | 'periodo' | 'horario' | 'tipo' | 'mesa' | 'confirmar';

/**
 * Where the booking conversation stands. The server keeps nothing between two
 * messages: this travels to the client with every answer and comes back with
 * the next one, and everything it claims is re-checked before a request is
 * created.
 */
export interface BookingContext {
  flujo: 'agendar';
  paso: BookingStep;
  candidatos?: BookingCandidate[];
  receptoraEeId?: number;
  receptoraNombre?: string;
  /** Slot starts as ISO text, because they make a round trip through JSON. */
  slots?: string[];
  horarioOpciones?: string[];
  duracionMin?: number;
  horas?: number[];
  inicio?: string;
  tipo?: 'PRESENCIAL' | 'VIRTUAL';
  mesas?: AssistantTable[];
  mesaOpciones?: string[];
  mesaId?: number | null;
}

/** One answer of the assistant, with whatever the client needs to answer back. */
export interface AssistantAnswer {
  respuesta: string;
  /** `null` closes the conversation; absent leaves it as it was. */
  contexto?: BookingContext | null;
  /** Ready-made answers the client may render as buttons. */
  opciones?: string[];
  imageUrl?: string;
}
