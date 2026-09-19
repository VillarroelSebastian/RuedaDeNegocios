import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import {
  COMPANY_NOTIFIER_PORT,
  type CompanyNotifierPort,
} from '../../../../shared/application/ports/company-notifier.port.js';
import {
  STAFF_NOTIFIER_PORT,
  type StaffNotifierPort,
} from '../../../../shared/application/ports/staff-notifier.port.js';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { meetingWindow } from '../../../eventos/domain/services/event-schedule.js';
import {
  MEETINGS_REPOSITORY,
  type AutomatedMeeting,
  type MeetingsRepositoryPort,
} from '../../domain/ports/meetings.repository.port.js';
import {
  EVALUATION_NOTICE,
  MISSING_LINK_AT_START_NOTICE,
  MISSING_LINK_NOTICE,
  closingNotice,
  isRemote,
  minutesLeft,
  missingLinkSoonNotice,
  reminderMessage,
  startedMessage,
  teamsStartingNotice,
} from '../../domain/services/meeting-automation.js';

const MINUTE = 60_000;
/** How far ahead a company is warned that a meeting is coming. */
const REMINDER_HORIZON_MINUTES = 30;
/** How far ahead the team is told that a virtual meeting still has no link. */
const MISSING_LINK_HORIZON_MINUTES = 30;
/** Somebody has to open the Teams room before the companies can get in. */
const TEAMS_HORIZON_MINUTES = 5;
/** A meeting is announced as closing once it is this close to its end. */
const CLOSING_HORIZON_MINUTES = 5;
/** A year: the same problem, on the same meeting, is raised only once. */
const ONCE_PER_MEETING_MINUTES = 525_600;
/** The meeting is already late, so the team is nagged every couple of minutes. */
const URGENT_LINK_COOLDOWN_MINUTES = 2;
const MEETING_REFERENCE = 'reunion';

function sidesOf(meeting: AutomatedMeeting): { companyEventId: number; contraparte: string | null }[] {
  return [
    { companyEventId: meeting.solicitanteId, contraparte: meeting.receptoraNombre },
    { companyEventId: meeting.receptoraId, contraparte: meeting.solicitanteNombre },
  ].filter(
    (side): side is { companyEventId: number; contraparte: string | null } =>
      side.companyEventId != null,
  );
}

/**
 * Reminds both companies of a meeting that is about to start.
 *
 * The reminder is flagged on the meeting itself, so it goes out exactly once
 * however often this runs.
 */
@Injectable()
export class SendMeetingRemindersUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<void> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return;

    const now = this.clock.now();
    const until = new Date(now.getTime() + REMINDER_HORIZON_MINUTES * MINUTE);
    const due = await this.meetings.listPendingReminders(event.id, meetingWindow(event), until);

    for (const meeting of due) {
      for (const side of sidesOf(meeting)) {
        await this.companies.notify({
          companyEventId: side.companyEventId,
          tipo: 'reunion:recordatorio',
          titulo: 'Reunión próxima',
          mensaje: reminderMessage(side.contraparte, meeting.inicio, meeting.numeroMesa),
          referenciaId: meeting.id,
          referenciaTabla: MEETING_REFERENCE,
        });
      }

      await this.meetings.markReminderSent(meeting.id);
    }
  }
}

/**
 * Keeps the meetings of the running event in the state the clock says they are
 * in: it starts them at their hour, warns before they end, and closes the ones
 * whose time ran out. It also calls the event team while a virtual meeting is
 * still missing the link it cannot happen without.
 *
 * Every step is idempotent, because this runs every few seconds.
 */
@Injectable()
export class SyncMeetingStatesUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
    @Inject(STAFF_NOTIFIER_PORT) private readonly staff: StaffNotifierPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<void> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return;

    const now = this.clock.now();
    const window = meetingWindow(event);

    await this.callForMissingLinks(event.id, window, now);
    await this.callForTeamsRooms(event.id, window, now);
    await this.startDueMeetings(event.id, window, now);
    await this.warnBeforeClosing(event.id, window, now);
    await this.closeOverdueMeetings(event.id, window, now);
  }

  /**
   * The standing list of virtual meetings with nowhere to happen. It is worth
   * a full sweep when the application starts; after that the horizons above
   * catch them as they approach.
   */
  async reviewPendingLinks(): Promise<void> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return;

    const pending = await this.meetings.listRemoteWithoutLink(
      event.id,
      meetingWindow(event),
      this.clock.now(),
    );

    for (const meeting of pending) {
      await this.staff.notify({
        eventId: meeting.eventId,
        ...MISSING_LINK_NOTICE,
        referenciaId: meeting.id,
        referenciaTabla: MEETING_REFERENCE,
        urgente: false,
        evitarDuplicadoMinutos: ONCE_PER_MEETING_MINUTES,
      });
    }
  }

  private async callForMissingLinks(eventId: number, window: TimeWindow, now: Date): Promise<void> {
    const until = new Date(now.getTime() + MISSING_LINK_HORIZON_MINUTES * MINUTE);
    const soon = await this.meetings.listRemoteWithoutLinkStartingBefore(
      eventId,
      window,
      now,
      until,
    );

    for (const meeting of soon) {
      await this.staff.notify({
        eventId: meeting.eventId,
        ...missingLinkSoonNotice(meeting.inicio),
        referenciaId: meeting.id,
        referenciaTabla: MEETING_REFERENCE,
        urgente: true,
        evitarDuplicadoMinutos: ONCE_PER_MEETING_MINUTES,
      });
    }
  }

  private async callForTeamsRooms(eventId: number, window: TimeWindow, now: Date): Promise<void> {
    const until = new Date(now.getTime() + TEAMS_HORIZON_MINUTES * MINUTE);
    const soon = await this.meetings.listTeamsStartingBefore(eventId, window, now, until);

    for (const meeting of soon) {
      await this.staff.notify({
        eventId: meeting.eventId,
        ...teamsStartingNotice(meeting.inicio),
        referenciaId: meeting.id,
        referenciaTabla: MEETING_REFERENCE,
        urgente: true,
        evitarDuplicadoMinutos: ONCE_PER_MEETING_MINUTES,
      });
    }
  }

  private async startDueMeetings(eventId: number, window: TimeWindow, now: Date): Promise<void> {
    const due = await this.meetings.listDueToStart(eventId, window, now);

    for (const meeting of due) {
      // A virtual meeting with no link cannot be entered: starting it would
      // only leave both companies staring at an empty screen.
      if (isRemote(meeting.tipoReunion) && !meeting.enlace) {
        await this.staff.notify({
          eventId: meeting.eventId,
          ...MISSING_LINK_AT_START_NOTICE,
          referenciaId: meeting.id,
          referenciaTabla: MEETING_REFERENCE,
          urgente: true,
          evitarDuplicadoMinutos: URGENT_LINK_COOLDOWN_MINUTES,
        });
        continue;
      }

      try {
        await this.meetings.startMeeting(meeting.id, now);
      } catch (error) {
        // A company pressed start in the same second. Theirs counts, and they
        // were told about it already.
        if (error instanceof ConflictError) continue;
        throw error;
      }

      for (const side of sidesOf(meeting)) {
        await this.companies.notify({
          companyEventId: side.companyEventId,
          tipo: 'reunion:iniciada',
          titulo: 'Reunión iniciada',
          mensaje: startedMessage(meeting.tipoReunion),
          referenciaId: meeting.id,
          referenciaTabla: MEETING_REFERENCE,
        });
      }
    }
  }

  private async warnBeforeClosing(eventId: number, window: TimeWindow, now: Date): Promise<void> {
    const until = new Date(now.getTime() + CLOSING_HORIZON_MINUTES * MINUTE);
    const ending = await this.meetings.listEndingSoon(eventId, window, now, until);

    for (const meeting of ending) {
      const notice = closingNotice(minutesLeft(now, meeting.fin));

      for (const side of sidesOf(meeting)) {
        await this.companies.notifyOnce({
          companyEventId: side.companyEventId,
          ...notice,
          referenciaId: meeting.id,
          referenciaTabla: MEETING_REFERENCE,
        });
      }
    }
  }

  private async closeOverdueMeetings(
    eventId: number,
    window: TimeWindow,
    now: Date,
  ): Promise<void> {
    const overdue = await this.meetings.listOverdue(eventId, window, now);

    for (const meeting of overdue) {
      await this.meetings.changeStatus(meeting.id, {
        estadoReunion: 'FINALIZADA',
        finReal: now,
      });

      for (const side of sidesOf(meeting)) {
        await this.companies.notifyOnce({
          companyEventId: side.companyEventId,
          ...EVALUATION_NOTICE,
          referenciaId: meeting.id,
          referenciaTabla: MEETING_REFERENCE,
        });
      }
    }
  }
}
