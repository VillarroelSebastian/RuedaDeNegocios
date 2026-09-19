import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';

export interface AssistantBooking {
  solicitanteId: number;
  receptoraId: number;
  companyUserId: number;
  tipoReunion: string;
  window: TimeWindow;
  mesaId: number | null;
  mensaje: string;
}

/**
 * Sending the meeting request the conversation ended up describing. Implemented
 * by the requests context: the assistant collects the answers, but every rule
 * that can reject a booking is re-checked by its owner, never here.
 */
export interface MeetingBookingPort {
  request(booking: AssistantBooking): Promise<void>;
}

export const MEETING_BOOKING_PORT = Symbol('MeetingBookingPort');
