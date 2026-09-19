import { Injectable } from '@nestjs/common';
import type { MeetingBookingPort } from '../../../asistente/application/ports/meeting-booking.port.js';
import type { AssistantBooking } from '../../../asistente/application/ports/meeting-booking.port.js';
import { CreateMeetingRequestUseCase } from '../../application/use-cases/manage-requests.use-cases.js';

/**
 * Creates the request the assistant's conversation ended in. It goes through
 * the same use case the form does, so the counterpart, the slot, the table and
 * the membership are checked exactly once and in one place.
 */
@Injectable()
export class AssistantMeetingBookingAdapter implements MeetingBookingPort {
  constructor(private readonly createRequest: CreateMeetingRequestUseCase) {}

  async request(booking: AssistantBooking): Promise<void> {
    await this.createRequest.execute({
      solicitanteId: booking.solicitanteId,
      companyUserId: booking.companyUserId,
      receptoraId: booking.receptoraId,
      tipo: booking.tipoReunion,
      inicio: booking.window.start.toISOString(),
      fin: booking.window.end.toISOString(),
      mesaId: booking.mesaId ?? undefined,
      mensaje: booking.mensaje,
    });
  }
}
