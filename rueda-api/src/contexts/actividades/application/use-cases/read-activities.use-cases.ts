import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import { boliviaDateKey, boliviaDateTime } from '../../../../shared/domain/bolivia-time.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  ACTIVITIES_REPOSITORY,
  type ActivitiesRepositoryPort,
  type ActivityRecord,
  type LiveActivity,
} from '../../domain/ports/activities.repository.port.js';

const DEFAULT_UPCOMING = 6;
const MAX_UPCOMING = 50;

export interface LiveSchedule {
  /** The client refreshes against this stamp to know whether anything moved. */
  actualizadoEn: string;
  /** Ids on air right now, so the screen highlights them without scanning. */
  enVivo: number[];
  actividades: LiveActivity[];
}

/**
 * The whole programme of the event. Unlike the legacy endpoint it is not
 * filtered by the event dates: the staff must be able to see every activity it
 * registered, whatever day it falls on, and hiding them only ever confused them.
 */
@Injectable()
export class ListActivitiesUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
  ) {}

  async execute(eventId?: number): Promise<ActivityRecord[]> {
    const event = eventId
      ? await this.activities.findEvent(eventId)
      : await this.activities.findPrincipalEvent();
    if (!event) return [];

    return this.activities.list(event.id);
  }
}

/** What the staff dashboard shows: the next few activities of the programme. */
@Injectable()
export class ListUpcomingActivitiesUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(limit = DEFAULT_UPCOMING): Promise<ActivityRecord[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_UPCOMING) {
      throw new ValidationError(`El límite debe estar entre 1 y ${MAX_UPCOMING}.`);
    }

    const event = await this.activities.findPrincipalEvent();
    if (!event) return [];

    // Today counts whole: an activity that started an hour ago is still the one
    // the staff is looking at.
    const now = this.clock.now();
    const startOfToday = boliviaDateTime(boliviaDateKey(now), 0, 0);

    return this.activities.listUpcoming(event.id, startOfToday, limit);
  }
}

/** The live schedule everyone watches during the event. */
@Injectable()
export class GetLiveScheduleUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<LiveSchedule> {
    const event = await this.activities.findPrincipalEvent();
    const actividades = event ? await this.activities.listWithAnnouncements(event.id) : [];

    return {
      actualizadoEn: this.clock.now().toISOString(),
      enVivo: actividades
        .filter((activity) => activity.estadoEnVivo === 'EN_VIVO')
        .map((activity) => activity.id),
      actividades,
    };
  }
}

/**
 * The activities the caller's own company follows. It is a separate resource so
 * the live schedule itself stays public and cacheable, and so no caller can ask
 * about somebody else's subscriptions.
 */
@Injectable()
export class ListOwnSubscriptionsUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
  ) {}

  execute(companyEventId: number): Promise<number[]> {
    return this.activities.listSubscribedActivityIds(companyEventId);
  }
}
