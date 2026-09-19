import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import {
  COMPANY_NOTIFIER_PORT,
  type CompanyNotifierPort,
} from '../../../../shared/application/ports/company-notifier.port.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import {
  ACTIVITIES_REPOSITORY,
  type ActivitiesRepositoryPort,
  type ActivityAnnouncement,
  type ActivityRecord,
} from '../../domain/ports/activities.repository.port.js';
import { planLiveTransition } from '../../domain/services/live-status.js';
import { GetLiveScheduleUseCase, type LiveSchedule } from './read-activities.use-cases.js';

/** `anuncioactividad.mensaje` is a VarChar(500). */
const MAX_ANNOUNCEMENT_LENGTH = 500;
const ACTIVITY_TABLE = 'actividadprograma';

/**
 * A company follows an activity to be told when it starts or when the staff
 * announces something about it. The enrollment comes from the caller's token,
 * never from the request, so nobody can subscribe another company.
 */
@Injectable()
export class SetActivitySubscriptionUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
  ) {}

  async execute(activityId: number, companyEventId: number, subscribed: boolean): Promise<void> {
    const enrollment = await this.activities.findEnrollmentEvent(companyEventId);
    if (!enrollment) {
      throw new ForbiddenError('Tu inscripción para el evento actual no está habilitada.');
    }

    const activity = await this.activities.findActivity(activityId, enrollment.eventId);
    if (!activity) {
      throw new NotFoundError('Actividad o empresa no válidas para este evento.');
    }

    await this.activities.setSubscription(activityId, companyEventId, subscribed);
  }
}

/** A note the staff pushes to everyone following the activity. */
@Injectable()
export class AnnounceOnActivityUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {}

  async execute(
    activityId: number,
    userId: number,
    mensaje: string,
  ): Promise<ActivityAnnouncement> {
    const trimmed = String(mensaje ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!trimmed) throw new ValidationError('El anuncio es obligatorio.');
    if (trimmed.length > MAX_ANNOUNCEMENT_LENGTH) {
      throw new ValidationError(
        `El anuncio no puede superar ${MAX_ANNOUNCEMENT_LENGTH} caracteres.`,
      );
    }

    const activity = await this.requireActivity(activityId);
    const announcement = await this.activities.addAnnouncement(activityId, userId, trimmed);

    await notifySubscribers(this.activities, this.companies, activityId, {
      tipo: 'evento:anuncio',
      titulo: `Aviso: ${activity.nombreActividad}`,
      mensaje: trimmed,
    });

    return announcement;
  }

  private async requireActivity(activityId: number): Promise<ActivityRecord> {
    const event = await this.activities.findPrincipalEvent();
    const activity = event ? await this.activities.findActivity(activityId, event.id) : null;
    if (!activity) throw new NotFoundError('No tienes acceso a esta actividad.');

    return activity;
  }
}

@Injectable()
export class RemoveActivityAnnouncementUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
  ) {}

  async execute(announcementId: number): Promise<void> {
    const event = await this.activities.findPrincipalEvent();
    const announcement = event
      ? await this.activities.findAnnouncement(announcementId, event.id)
      : null;
    if (!announcement) throw new NotFoundError('Anuncio no encontrado.');

    await this.activities.deactivateAnnouncement(announcementId);
  }
}

/**
 * What the staff moves during the event. It answers with the whole schedule
 * because that is exactly what the screen re-renders after every change.
 */
@Injectable()
export class SetLiveStatusUseCase {
  constructor(
    @Inject(ACTIVITIES_REPOSITORY) private readonly activities: ActivitiesRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(activityId: number, estadoEnVivo: string, notaEnVivo?: string): Promise<LiveSchedule> {
    const event = await this.activities.findPrincipalEvent();
    const activity = event ? await this.activities.findActivity(activityId, event.id) : null;
    const current = event ? await this.activities.findLiveStatus(activityId, event.id) : null;
    if (!activity || !current) throw new NotFoundError('Actividad no encontrada.');

    const transition = planLiveTransition(current, estadoEnVivo, this.clock.now(), notaEnVivo);
    await this.activities.applyLiveTransition(activityId, transition);

    if (transition.notifySubscribers) {
      await notifySubscribers(this.activities, this.companies, activityId, {
        tipo: 'evento:inicio',
        titulo: `Ya inició: ${activity.nombreActividad}`,
        mensaje: 'La actividad a la que te suscribiste acaba de comenzar.',
      });
    }

    return new GetLiveScheduleUseCase(this.activities, this.clock).execute();
  }
}

/** Notifying is best effort: it never undoes what the staff just recorded. */
async function notifySubscribers(
  activities: ActivitiesRepositoryPort,
  companies: CompanyNotifierPort,
  activityId: number,
  notification: { tipo: string; titulo: string; mensaje: string },
): Promise<void> {
  const subscribers = await activities.listSubscribers(activityId);

  for (const companyEventId of subscribers) {
    await companies.notify({
      companyEventId,
      referenciaId: activityId,
      referenciaTabla: ACTIVITY_TABLE,
      ...notification,
    });
  }
}
