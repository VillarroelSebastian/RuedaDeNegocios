import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import type {
  EventScheduleSource,
} from '../../../eventos/domain/services/event-schedule.js';
import type { HourRange } from '../../../eventos/domain/services/meeting-hours.js';

/** The event whose agenda is being laid out, with how it paces its meetings. */
export interface ScheduleEvent extends EventScheduleSource {
  id: number;
  duracionReunion: number;
  tiempoEntreReuniones: number;
}

export interface EnrollmentSchedule {
  id: number;
  eventId: number;
  /** Per-day availability the company saved, as free-form JSON. */
  horariosDisponibilidadJson: string | null;
}

export interface ScheduleRepositoryPort {
  findPrincipalEvent(): Promise<ScheduleEvent | null>;
  findEvent(eventId: number): Promise<ScheduleEvent | null>;
  /** An enrollment that is still active in its event. */
  findEnrollment(companyEventId: number): Promise<EnrollmentSchedule | null>;
  /** Both sides of a request, so editing one only needs to name the request. */
  findRequestParties(
    requestId: number,
  ): Promise<{ solicitanteId: number; receptoraId: number } | null>;

  /** Meetings of a company that still stand, on either side of the table. */
  listMeetings(
    eventId: number,
    companyEventId: number,
    excludeMeetingId: number | null,
  ): Promise<TimeWindow[]>;
  /** Requests of a company still waiting for an answer. */
  listPendingRequests(
    companyEventId: number,
    excludeRequestId: number | null,
  ): Promise<TimeWindow[]>;
  listBlocks(companyEventId: number): Promise<TimeWindow[]>;
  listRanges(companyEventId: number): Promise<HourRange[]>;

  /** Replaces the declared hours, and the blocks derived from them, in one step. */
  replaceRanges(
    companyEventId: number,
    rangos: HourRange[],
    blocks: TimeWindow[],
  ): Promise<void>;
  saveDailyAvailability(companyEventId: number, stored: string): Promise<void>;

  clearBlocks(companyEventId: number): Promise<void>;
  findBlockAt(companyEventId: number, start: Date): Promise<{ id: number } | null>;
  deactivateBlock(blockId: number): Promise<void>;
  createBlock(companyEventId: number, window: TimeWindow): Promise<void>;
}

export const SCHEDULE_REPOSITORY = Symbol('ScheduleRepositoryPort');
