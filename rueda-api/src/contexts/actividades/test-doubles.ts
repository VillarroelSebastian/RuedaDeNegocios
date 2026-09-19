import type {
  ActivitiesRepositoryPort,
  ActivityAnnouncement,
  ActivityEvent,
  ActivityRecord,
  LiveActivity,
} from './domain/ports/activities.repository.port.js';
import type { ActivityDraft } from './domain/services/activity-schedule.js';
import type { LiveStatusSource, LiveTransition } from './domain/services/live-status.js';

/**
 * In-memory doubles for the activities context. They implement the ports
 * literally so the use-case tests exercise real behaviour without a database.
 */

/** A three-day event in November, which is what the event dates resolve to. */
export const EVENT: ActivityEvent = {
  id: 7,
  startsAt: new Date('2026-11-10T00:00:00.000Z'),
  endsAt: new Date('2026-11-13T00:00:00.000Z'),
  registrationStartsAt: null,
  registrationEndsAt: null,
  meetingHoursJson: null,
};

export function buildActivity(overrides: Partial<ActivityRecord> = {}): ActivityRecord {
  return {
    id: 1,
    tipoActividad: 'Seminario',
    nombreActividad: 'Apertura oficial',
    descripcionActividad: 'Acto inaugural',
    nombreSalaEspacio: 'Salón principal',
    capacidadPersonasSala: 120,
    fechaActividad: '2026-11-10',
    horaInicioActividad: '09:00',
    horaFinActividad: '10:30',
    nombreCompletoPilaExpositor: null,
    organizacionDelExpositor: null,
    urlImagenBannerActividad: null,
    estadoActividad: 'Activo',
    linkReunionVirtual: null,
    direccionTexto: null,
    ubicacionGoogleMapsPresencial: null,
    estadoEnVivo: 'PENDIENTE',
    notaEnVivo: null,
    horaInicioReal: null,
    horaFinReal: null,
    ...overrides,
  };
}

export function buildDraftBody(overrides: Record<string, unknown> = {}) {
  return {
    tipoActividad: 'Seminario',
    nombreActividad: 'Apertura oficial',
    descripcionActividad: 'Acto inaugural',
    nombreSalaEspacio: 'Salón principal',
    capacidadPersonasSala: 120,
    fechaActividad: '2026-11-10',
    horaInicioActividad: '09:00',
    horaFinActividad: '10:30',
    ...overrides,
  };
}

export interface FakeActivitiesOptions {
  event?: ActivityEvent | null;
  activities?: ActivityRecord[];
  announcements?: ActivityAnnouncement[];
  liveStatus?: LiveStatusSource | null;
  enrollmentEvent?: { eventId: number } | null;
  subscribedActivityIds?: number[];
  subscribers?: number[];
  announcement?: { id: number; activityId: number } | null;
}

export class FakeActivitiesRepository implements ActivitiesRepositoryPort {
  readonly created: { eventId: number; draft: ActivityDraft }[] = [];
  readonly updated: { activityId: number; draft: ActivityDraft }[] = [];
  readonly deactivated: number[] = [];
  readonly transitions: { activityId: number; transition: LiveTransition }[] = [];
  readonly subscriptions: { activityId: number; companyEventId: number; subscribed: boolean }[] =
    [];
  readonly addedAnnouncements: { activityId: number; userId: number; mensaje: string }[] = [];
  readonly deactivatedAnnouncements: number[] = [];
  upcomingCalls: { from: Date; limit: number }[] = [];

  constructor(private readonly options: FakeActivitiesOptions = {}) {}

  private get activities(): ActivityRecord[] {
    return this.options.activities ?? [buildActivity()];
  }

  async findPrincipalEvent(): Promise<ActivityEvent | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async findEvent(): Promise<ActivityEvent | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async list(): Promise<ActivityRecord[]> {
    return this.activities;
  }

  async listUpcoming(_eventId: number, from: Date, limit: number): Promise<ActivityRecord[]> {
    this.upcomingCalls.push({ from, limit });
    return this.activities.slice(0, limit);
  }

  async listWithAnnouncements(): Promise<LiveActivity[]> {
    return this.activities.map((activity) => ({
      ...activity,
      anuncios: this.options.announcements ?? [],
    }));
  }

  async findActivity(activityId: number, eventId: number): Promise<ActivityRecord | null> {
    // The real query is scoped to the event, so the double is too: an activity
    // of another event must be invisible here.
    if (eventId !== EVENT.id) return null;
    return this.activities.find((activity) => activity.id === activityId) ?? null;
  }

  async findLiveStatus(): Promise<LiveStatusSource | null> {
    return this.options.liveStatus === undefined
      ? { estadoEnVivo: 'PENDIENTE', horaInicioReal: null, horaFinReal: null }
      : this.options.liveStatus;
  }

  async create(eventId: number, draft: ActivityDraft): Promise<ActivityRecord> {
    this.created.push({ eventId, draft });
    return buildActivity({ id: 99, nombreActividad: draft.nombreActividad });
  }

  async update(activityId: number, draft: ActivityDraft): Promise<ActivityRecord> {
    this.updated.push({ activityId, draft });
    return buildActivity({ id: activityId, nombreActividad: draft.nombreActividad });
  }

  async deactivate(activityId: number): Promise<void> {
    this.deactivated.push(activityId);
  }

  async applyLiveTransition(activityId: number, transition: LiveTransition): Promise<void> {
    this.transitions.push({ activityId, transition });
  }

  async findEnrollmentEvent(): Promise<{ eventId: number } | null> {
    return this.options.enrollmentEvent === undefined
      ? { eventId: EVENT.id }
      : this.options.enrollmentEvent;
  }

  async setSubscription(
    activityId: number,
    companyEventId: number,
    subscribed: boolean,
  ): Promise<void> {
    this.subscriptions.push({ activityId, companyEventId, subscribed });
  }

  async listSubscribedActivityIds(): Promise<number[]> {
    return this.options.subscribedActivityIds ?? [];
  }

  async listSubscribers(): Promise<number[]> {
    return this.options.subscribers ?? [];
  }

  async addAnnouncement(
    activityId: number,
    userId: number,
    mensaje: string,
  ): Promise<ActivityAnnouncement> {
    this.addedAnnouncements.push({ activityId, userId, mensaje });
    return { id: 55, mensaje, fechaCreacion: new Date('2026-11-10T13:00:00.000Z'), autor: null };
  }

  async findAnnouncement(): Promise<{ id: number; activityId: number } | null> {
    return this.options.announcement === undefined
      ? { id: 55, activityId: 1 }
      : this.options.announcement;
  }

  async deactivateAnnouncement(announcementId: number): Promise<void> {
    this.deactivatedAnnouncements.push(announcementId);
  }
}
