import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_REPOSITORY,
  type EventRecord,
  type EventRepositoryPort,
  type EventStats,
} from '../../domain/ports/event.repository.port.js';
import { meetingWindow } from '../../domain/services/event-schedule.js';

export interface CurrentEventView extends EventRecord {
  stats: EventStats;
  /** Window meetings may be scheduled in, derived from the saved logistics. */
  fechaInicioReuniones: Date;
  fechaFinReuniones: Date;
}

/**
 * The single view of the event currently running. Replaces `GET /public/evento`,
 * `GET /evento-principal` and `GET /empresa/evento`, which returned three
 * different shapes of the same record.
 */
@Injectable()
export class GetCurrentEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort) {}

  async execute(): Promise<CurrentEventView | null> {
    const event = await this.events.findPrincipal();
    if (!event) return null;

    const window = meetingWindow(toSchedule(event));
    return {
      ...event,
      stats: await this.events.statsFor(event),
      fechaInicioReuniones: window.start,
      fechaFinReuniones: window.end,
    };
  }
}

export function toSchedule(event: EventRecord) {
  return {
    startsAt: event.fechaInicioEvento,
    endsAt: event.fechaFinEvento,
    registrationStartsAt: event.fechaInicioSolicitudes,
    registrationEndsAt: event.fechaFinSolicitudes,
    meetingHoursJson: event.horariosReunionJson,
  };
}
