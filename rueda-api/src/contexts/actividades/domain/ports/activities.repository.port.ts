import type { EventScheduleSource } from '../../../eventos/domain/services/event-schedule.js';
import type { ActivityDraft } from '../services/activity-schedule.js';
import type { LiveStatusSource, LiveTransition } from '../services/live-status.js';

/** The event an activity hangs from, with what its programme days come from. */
export interface ActivityEvent extends EventScheduleSource {
  id: number;
}

/**
 * An activity as the API hands it out. The day and the two times of day travel
 * as labels (`2026-11-10`, `09:00`), never as instants: they describe what the
 * sign on the room says, not a moment in a time zone.
 */
export interface ActivityRecord {
  id: number;
  tipoActividad: string;
  nombreActividad: string;
  descripcionActividad: string;
  nombreSalaEspacio: string;
  capacidadPersonasSala: number;
  fechaActividad: string;
  horaInicioActividad: string;
  horaFinActividad: string;
  nombreCompletoPilaExpositor: string | null;
  organizacionDelExpositor: string | null;
  urlImagenBannerActividad: string | null;
  estadoActividad: string;
  linkReunionVirtual: string | null;
  direccionTexto: string | null;
  ubicacionGoogleMapsPresencial: string | null;
  estadoEnVivo: string;
  notaEnVivo: string | null;
  /** When it actually started and ended, stamped by the staff during the event. */
  horaInicioReal: Date | null;
  horaFinReal: Date | null;
}

export interface ActivityAnnouncement {
  id: number;
  mensaje: string;
  fechaCreacion: Date;
  autor: { nombres: string; apellidoPaterno: string } | null;
}

export interface LiveActivity extends ActivityRecord {
  anuncios: ActivityAnnouncement[];
}

export interface ActivitiesRepositoryPort {
  findPrincipalEvent(): Promise<ActivityEvent | null>;
  findEvent(eventId: number): Promise<ActivityEvent | null>;

  list(eventId: number): Promise<ActivityRecord[]>;
  /** The next activities of the programme, from `from` onwards. */
  listUpcoming(eventId: number, from: Date, limit: number): Promise<ActivityRecord[]>;
  listWithAnnouncements(eventId: number): Promise<LiveActivity[]>;
  findActivity(activityId: number, eventId: number): Promise<ActivityRecord | null>;
  findLiveStatus(activityId: number, eventId: number): Promise<LiveStatusSource | null>;

  create(eventId: number, draft: ActivityDraft): Promise<ActivityRecord>;
  update(activityId: number, draft: ActivityDraft): Promise<ActivityRecord>;
  deactivate(activityId: number): Promise<void>;
  applyLiveTransition(activityId: number, transition: LiveTransition): Promise<void>;

  /** The enrollment's event, so a company only touches its own programme. */
  findEnrollmentEvent(companyEventId: number): Promise<{ eventId: number } | null>;
  setSubscription(activityId: number, companyEventId: number, subscribed: boolean): Promise<void>;
  listSubscribedActivityIds(companyEventId: number): Promise<number[]>;
  /** `empresaevento` ids following the activity right now. */
  listSubscribers(activityId: number): Promise<number[]>;

  addAnnouncement(
    activityId: number,
    userId: number,
    mensaje: string,
  ): Promise<ActivityAnnouncement>;
  findAnnouncement(
    announcementId: number,
    eventId: number,
  ): Promise<{ id: number; activityId: number } | null>;
  deactivateAnnouncement(announcementId: number): Promise<void>;
}

export const ACTIVITIES_REPOSITORY = Symbol('ActivitiesRepositoryPort');
