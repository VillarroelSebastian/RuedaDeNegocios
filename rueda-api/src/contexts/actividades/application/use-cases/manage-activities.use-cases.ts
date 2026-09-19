import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { eventDates } from '../../../eventos/domain/services/event-schedule.js';
import {
  ACTIVITIES_REPOSITORY,
  type ActivitiesRepositoryPort,
  type ActivityEvent,
  type ActivityRecord,
} from '../../domain/ports/activities.repository.port.js';
import {
  type ActivityDraftInput,
  sanitizeActivityDraft,
} from '../../domain/services/activity-schedule.js';

const NO_EVENT = 'No hay evento principal configurado';
const NOT_IN_EVENT = 'Actividad no encontrada en el evento activo';

/** Every write targets the event that is running; there is no other programme. */
async function currentEvent(activities: ActivitiesRepositoryPort): Promise<ActivityEvent> {
  const event = await activities.findPrincipalEvent();
  if (!event) throw new ValidationError(NO_EVENT);
  return event;
}

@Injectable()
export class CreateActivityUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
  ) {}

  async execute(input: ActivityDraftInput): Promise<ActivityRecord> {
    const event = await currentEvent(this.activities);
    const draft = sanitizeActivityDraft(input, eventDates(event));

    return this.activities.create(event.id, draft);
  }
}

@Injectable()
export class UpdateActivityUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
  ) {}

  async execute(activityId: number, input: ActivityDraftInput): Promise<ActivityRecord> {
    const event = await currentEvent(this.activities);

    const existing = await this.activities.findActivity(activityId, event.id);
    if (!existing) throw new NotFoundError(NOT_IN_EVENT);

    const draft = sanitizeActivityDraft(input, eventDates(event));
    return this.activities.update(activityId, draft);
  }
}

/** Retires the activity. History keeps it; the programme stops showing it. */
@Injectable()
export class DeleteActivityUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
  ) {}

  async execute(activityId: number): Promise<void> {
    const event = await currentEvent(this.activities);

    const existing = await this.activities.findActivity(activityId, event.id);
    if (!existing) throw new NotFoundError(NOT_IN_EVENT);

    await this.activities.deactivate(activityId);
  }
}
