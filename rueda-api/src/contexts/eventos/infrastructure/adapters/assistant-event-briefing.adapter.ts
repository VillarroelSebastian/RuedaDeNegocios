import { Injectable } from '@nestjs/common';
import type { EventBriefingPort } from '../../../asistente/application/ports/event-briefing.port.js';
import type { EventBriefing } from '../../../asistente/domain/models/assistant-view.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import { meetingWindow } from '../../domain/services/event-schedule.js';

/**
 * Answers the assistant about the event. It lives here because the window an
 * event really runs in is this context's rule, not a pair of raw columns.
 */
@Injectable()
export class AssistantEventBriefingAdapter implements EventBriefingPort {
  constructor(private readonly prisma: PrismaService) {}

  async findBriefing(eventId: number): Promise<EventBriefing | null> {
    const event = await this.prisma.evento.findFirst({
      where: { id: eventId, estaActivo: { not: 0 } },
    });
    if (!event) return null;

    const window = meetingWindow({
      startsAt: event.fechaInicioEvento,
      endsAt: event.fechaFinEvento,
      registrationStartsAt: event.fechaInicioSolicitudes,
      registrationEndsAt: event.fechaFinSolicitudes,
      meetingHoursJson: event.horariosReunionJson,
    });

    return {
      id: event.id,
      nombre: event.nombre,
      inicio: window.start,
      fin: window.end,
      urlImagenMapaRecinto: event.urlImagenMapaRecinto,
      urlImagenCronogramaCharlas: event.urlImagenCronogramaCharlas,
    };
  }
}
