import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  dailyMeetingWindows,
  meetingDates,
} from '../../../eventos/domain/services/event-schedule.js';
import {
  SCHEDULE_REPOSITORY,
  type EnrollmentSchedule,
  type ScheduleEvent,
  type ScheduleRepositoryPort,
} from '../../domain/ports/schedule.repository.port.js';
import {
  type AgendaEntry,
  buildAgenda,
  parseStoredAvailability,
} from '../../domain/services/slot-availability.js';
import { fixedSlots, type Slot, technicianCandidates } from '../../domain/services/slot-grid.js';

export interface AgendaQuery {
  /** The company asking, taken from its token. */
  companyEventId: number;
  receptoraId?: number;
  /** Editing a meeting: its own slot must not count as taken. */
  excludeReunionId?: number;
  /** Editing a request: it names the other company and frees its own slot. */
  solicitudId?: number;
}

export interface AgendaView {
  duracionMinutos: number;
  tiempoEntreReuniones: number;
  /** Only the slots that can be taken, which is what a picker needs. */
  horarios: { inicio: string; fin: string }[];
  /** Every slot with the reason it can or cannot be taken. */
  agenda: AgendaEntry[];
}

const EMPTY_AGENDA: AgendaView = {
  duracionMinutos: 0,
  tiempoEntreReuniones: 0,
  horarios: [],
  agenda: [],
};

interface Pair {
  event: ScheduleEvent;
  asking: EnrollmentSchedule;
  receiving: EnrollmentSchedule;
}

/**
 * Lays out the agenda between two companies. Both sides count: a slot is only
 * offered when neither of them is busy, blocked or outside the hours it declared.
 */
@Injectable()
export class GetAgendaUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) protected readonly schedule: ScheduleRepositoryPort,
    @Inject(CLOCK_PORT) protected readonly clock: ClockPort,
  ) {}

  async execute(query: AgendaQuery): Promise<AgendaView> {
    const pair = await this.resolvePair(query);
    if (!pair) return EMPTY_AGENDA;

    // The company picker is drawn on the fixed grid of meeting plus break.
    const slots = fixedSlots(
      dailyMeetingWindows(pair.event),
      pair.event.duracionReunion,
      pair.event.tiempoEntreReuniones,
    );

    return this.agendaOf(pair, slots, query, false);
  }

  protected async resolvePair(query: AgendaQuery): Promise<Pair | null> {
    const receptoraId = await this.resolveReceiver(query);

    const [asking, receiving] = await Promise.all([
      this.schedule.findEnrollment(query.companyEventId),
      this.schedule.findEnrollment(receptoraId),
    ]);
    if (!asking || !receiving) {
      throw new ValidationError('Una de las empresas ya no está activa en el evento.');
    }
    if (asking.eventId !== receiving.eventId) {
      throw new ValidationError('Las empresas deben pertenecer al mismo evento.');
    }

    const event = await this.schedule.findEvent(asking.eventId);
    return event ? { event, asking, receiving } : null;
  }

  /** Editing a request only needs to name the request; the other side follows. */
  private async resolveReceiver(query: AgendaQuery): Promise<number> {
    if (query.receptoraId) return query.receptoraId;

    const parties = query.solicitudId
      ? await this.schedule.findRequestParties(query.solicitudId)
      : null;
    if (!parties) throw new NotFoundError('No se pudo determinar la empresa receptora');

    return parties.solicitanteId === query.companyEventId
      ? parties.receptoraId
      : parties.solicitanteId;
  }

  protected async agendaOf(
    pair: Pair,
    slots: Slot[],
    query: AgendaQuery,
    ignoreCompanyAvailability: boolean,
  ): Promise<AgendaView> {
    const { event, asking, receiving } = pair;
    if (slots.length === 0) {
      return { ...EMPTY_AGENDA, duracionMinutos: event.duracionReunion };
    }

    const excludeMeeting = query.excludeReunionId ?? null;
    const excludeRequest = query.solicitudId ?? null;

    const [meetings, pendingRequests, blocks, receiverRanges] = await Promise.all([
      this.bothSides((id) => this.schedule.listMeetings(event.id, id, excludeMeeting), pair),
      this.bothSides((id) => this.schedule.listPendingRequests(id, excludeRequest), pair),
      this.bothSides((id) => this.schedule.listBlocks(id), pair),
      this.schedule.listRanges(receiving.id),
    ]);

    const agenda = buildAgenda(slots, {
      now: this.clock.now(),
      cleanupMinutes: event.tiempoEntreReuniones,
      meetings,
      pendingRequests,
      blocks,
      receiverRanges,
      dailyAvailability: [
        parseStoredAvailability(asking.horariosDisponibilidadJson),
        parseStoredAvailability(receiving.horariosDisponibilidadJson),
      ],
      ignoreCompanyAvailability,
    });

    return {
      duracionMinutos: event.duracionReunion,
      tiempoEntreReuniones: event.tiempoEntreReuniones,
      horarios: agenda
        .filter((entry) => entry.disponible)
        .map((entry) => ({ inicio: entry.inicio, fin: entry.fin })),
      agenda,
    };
  }

  private async bothSides(
    read: (companyEventId: number) => Promise<TimeWindow[]>,
    pair: Pair,
  ): Promise<TimeWindow[]> {
    const [mine, theirs] = await Promise.all([read(pair.asking.id), read(pair.receiving.id)]);
    return [...mine, ...theirs];
  }
}

/**
 * The same agenda for the event team, on its own working day: any hour of the
 * local day, and past whatever hours the companies declared. What it still
 * cannot do is double-book a meeting that already exists.
 */
@Injectable()
export class GetStaffAgendaUseCase extends GetAgendaUseCase {
  async execute(query: AgendaQuery): Promise<AgendaView> {
    const pair = await this.resolvePair(query);
    if (!pair) return EMPTY_AGENDA;

    const slots = technicianCandidates(meetingDates(pair.event), pair.event.duracionReunion);

    return this.agendaOf(pair, slots, query, true);
  }
}
