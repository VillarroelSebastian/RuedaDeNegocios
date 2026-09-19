import type { TimeWindow } from '../../shared/domain/bolivia-time.js';
import type { HourRange } from '../eventos/domain/services/meeting-hours.js';
import type {
  EnrollmentSchedule,
  ScheduleEvent,
  ScheduleRepositoryPort,
} from './domain/ports/schedule.repository.port.js';

/**
 * In-memory doubles for the schedule context. They implement the ports
 * literally so the use-case tests exercise real behaviour without a database.
 */

/** Two days of event, 20 minute meetings with a 10 minute break. */
export const EVENT: ScheduleEvent = {
  id: 7,
  startsAt: new Date('2026-11-10T12:00:00.000Z'),
  endsAt: new Date('2026-11-11T22:00:00.000Z'),
  registrationStartsAt: null,
  registrationEndsAt: null,
  meetingHoursJson: JSON.stringify([
    { fecha: '2026-11-10', habilitado: true, rangos: [{ desde: '08:00', hasta: '10:00' }] },
    { fecha: '2026-11-11', habilitado: true, rangos: [{ desde: '08:00', hasta: '10:00' }] },
  ]),
  duracionReunion: 20,
  tiempoEntreReuniones: 10,
};

export const ASKING_ID = 100;
export const RECEIVING_ID = 200;

export function buildEnrollment(overrides: Partial<EnrollmentSchedule> = {}): EnrollmentSchedule {
  return { id: ASKING_ID, eventId: EVENT.id, horariosDisponibilidadJson: null, ...overrides };
}

export interface FakeScheduleOptions {
  event?: ScheduleEvent | null;
  enrollments?: Record<number, EnrollmentSchedule | null>;
  parties?: { solicitanteId: number; receptoraId: number } | null;
  meetings?: Record<number, TimeWindow[]>;
  pendingRequests?: Record<number, TimeWindow[]>;
  blocks?: Record<number, TimeWindow[]>;
  ranges?: HourRange[];
  blockAt?: { id: number } | null;
}

export class FakeScheduleRepository implements ScheduleRepositoryPort {
  readonly replacedRanges: { companyEventId: number; rangos: HourRange[]; blocks: TimeWindow[] }[] =
    [];
  readonly savedAvailability: { companyEventId: number; stored: string }[] = [];
  readonly clearedBlocks: number[] = [];
  readonly deactivatedBlocks: number[] = [];
  readonly createdBlocks: { companyEventId: number; window: TimeWindow }[] = [];
  readonly meetingCalls: { companyEventId: number; excludeMeetingId: number | null }[] = [];
  readonly requestCalls: { companyEventId: number; excludeRequestId: number | null }[] = [];

  constructor(private readonly options: FakeScheduleOptions = {}) {}

  async findPrincipalEvent(): Promise<ScheduleEvent | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async findEvent(): Promise<ScheduleEvent | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async findEnrollment(companyEventId: number): Promise<EnrollmentSchedule | null> {
    if (this.options.enrollments) {
      return this.options.enrollments[companyEventId] ?? null;
    }
    return buildEnrollment({ id: companyEventId });
  }

  async findRequestParties() {
    return this.options.parties === undefined
      ? { solicitanteId: ASKING_ID, receptoraId: RECEIVING_ID }
      : this.options.parties;
  }

  async listMeetings(
    _eventId: number,
    companyEventId: number,
    excludeMeetingId: number | null,
  ): Promise<TimeWindow[]> {
    this.meetingCalls.push({ companyEventId, excludeMeetingId });
    return this.options.meetings?.[companyEventId] ?? [];
  }

  async listPendingRequests(
    companyEventId: number,
    excludeRequestId: number | null,
  ): Promise<TimeWindow[]> {
    this.requestCalls.push({ companyEventId, excludeRequestId });
    return this.options.pendingRequests?.[companyEventId] ?? [];
  }

  async listBlocks(companyEventId: number): Promise<TimeWindow[]> {
    return this.options.blocks?.[companyEventId] ?? [];
  }

  async listRanges(): Promise<HourRange[]> {
    return this.options.ranges ?? [];
  }

  async replaceRanges(
    companyEventId: number,
    rangos: HourRange[],
    blocks: TimeWindow[],
  ): Promise<void> {
    this.replacedRanges.push({ companyEventId, rangos, blocks });
  }

  async saveDailyAvailability(companyEventId: number, stored: string): Promise<void> {
    this.savedAvailability.push({ companyEventId, stored });
  }

  async clearBlocks(companyEventId: number): Promise<void> {
    this.clearedBlocks.push(companyEventId);
  }

  async findBlockAt(): Promise<{ id: number } | null> {
    return this.options.blockAt === undefined ? null : this.options.blockAt;
  }

  async deactivateBlock(blockId: number): Promise<void> {
    this.deactivatedBlocks.push(blockId);
  }

  async createBlock(companyEventId: number, window: TimeWindow): Promise<void> {
    this.createdBlocks.push({ companyEventId, window });
  }
}
