import { Injectable } from '@nestjs/common';
import { boliviaDateKey } from '../../../../shared/domain/bolivia-time.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  ActivitiesRepositoryPort,
  ActivityAnnouncement,
  ActivityEvent,
  ActivityRecord,
  LiveActivity,
} from '../../domain/ports/activities.repository.port.js';
import {
  type ActivityDraft,
  dateKeyOf,
  formatTimeOfDay,
} from '../../domain/services/activity-schedule.js';
import type { LiveStatusSource, LiveTransition } from '../../domain/services/live-status.js';

const EVENT_SELECT = {
  id: true,
  fechaInicioEvento: true,
  fechaFinEvento: true,
  fechaInicioSolicitudes: true,
  fechaFinSolicitudes: true,
  horariosReunionJson: true,
} as const;

const ACTIVITY_SELECT = {
  id: true,
  tipoActividad: true,
  nombreActividad: true,
  descripcionActividad: true,
  nombreSalaEspacio: true,
  capacidadPersonasSala: true,
  fechaActividad: true,
  horaInicioActividad: true,
  horaFinActividad: true,
  nombreCompletoPilaExpositor: true,
  organizacionDelExpositor: true,
  urlImagenBannerActividad: true,
  estadoActividad: true,
  linkReunionVirtual: true,
  direccion_texto: true,
  ubicacionGoogleMapsPresencial: true,
  estadoEnVivo: true,
  notaEnVivo: true,
  horaInicioReal: true,
  horaFinReal: true,
} as const;

/** Newest first, and only the handful the live screen actually shows. */
const ANNOUNCEMENTS_PER_ACTIVITY = 10;

const PROGRAMME_ORDER = [
  { fechaActividad: 'asc' },
  { horaInicioActividad: 'asc' },
] as const;

type ActivityRow = Record<string, any>;

function toEvent(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    startsAt: row.fechaInicioEvento,
    endsAt: row.fechaFinEvento,
    registrationStartsAt: row.fechaInicioSolicitudes,
    registrationEndsAt: row.fechaFinSolicitudes,
    meetingHoursJson: row.horariosReunionJson,
  };
}

function toActivity(row: ActivityRow): ActivityRecord {
  return {
    id: row.id,
    tipoActividad: row.tipoActividad,
    nombreActividad: row.nombreActividad,
    descripcionActividad: row.descripcionActividad,
    nombreSalaEspacio: row.nombreSalaEspacio,
    capacidadPersonasSala: row.capacidadPersonasSala,
    fechaActividad: dateKeyOf(row.fechaActividad),
    horaInicioActividad: formatTimeOfDay(row.horaInicioActividad),
    horaFinActividad: formatTimeOfDay(row.horaFinActividad),
    nombreCompletoPilaExpositor: row.nombreCompletoPilaExpositor,
    organizacionDelExpositor: row.organizacionDelExpositor,
    urlImagenBannerActividad: row.urlImagenBannerActividad,
    estadoActividad: row.estadoActividad,
    linkReunionVirtual: row.linkReunionVirtual,
    direccionTexto: row.direccion_texto,
    ubicacionGoogleMapsPresencial: row.ubicacionGoogleMapsPresencial,
    estadoEnVivo: row.estadoEnVivo,
    notaEnVivo: row.notaEnVivo,
    horaInicioReal: row.horaInicioReal,
    horaFinReal: row.horaFinReal,
  };
}

function toAnnouncement(row: ActivityRow): ActivityAnnouncement {
  return {
    id: row.id,
    mensaje: row.mensaje,
    fechaCreacion: row.fechaCreacion,
    autor: row.usuario
      ? { nombres: row.usuario.nombres, apellidoPaterno: row.usuario.apellidoPaterno }
      : null,
  };
}

/** The columns of a draft, shared by the insert and the update. */
function toColumns(draft: ActivityDraft) {
  return {
    tipoActividad: draft.tipoActividad,
    nombreActividad: draft.nombreActividad,
    descripcionActividad: draft.descripcionActividad,
    nombreSalaEspacio: draft.nombreSalaEspacio,
    capacidadPersonasSala: draft.capacidadPersonasSala,
    fechaActividad: draft.fechaActividad,
    horaInicioActividad: draft.horaInicioActividad,
    horaFinActividad: draft.horaFinActividad,
    nombreCompletoPilaExpositor: draft.nombreCompletoPilaExpositor,
    organizacionDelExpositor: draft.organizacionDelExpositor,
    urlImagenBannerActividad: draft.urlImagenBannerActividad,
    estadoActividad: draft.estadoActividad,
    linkReunionVirtual: draft.linkReunionVirtual,
    direccion_texto: draft.direccionTexto,
    ubicacionGoogleMapsPresencial: draft.ubicacionGoogleMapsPresencial,
  };
}

@Injectable()
export class PrismaActivitiesRepository implements ActivitiesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEvent(): Promise<ActivityEvent | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: EVENT_SELECT,
    });
    return row ? toEvent(row) : null;
  }

  async findEvent(eventId: number): Promise<ActivityEvent | null> {
    const row = await this.prisma.evento.findFirst({
      where: { id: eventId, estaActivo: { not: 0 } },
      select: EVENT_SELECT,
    });
    return row ? toEvent(row) : null;
  }

  async list(eventId: number): Promise<ActivityRecord[]> {
    const rows = await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: [...PROGRAMME_ORDER],
      select: ACTIVITY_SELECT,
    });
    return rows.map(toActivity);
  }

  async listUpcoming(eventId: number, from: Date, limit: number): Promise<ActivityRecord[]> {
    // `fechaActividad` is a bare date, so the comparison is made against the
    // calendar day `from` falls on rather than against an instant.
    const fromDay = new Date(`${boliviaDateKey(from)}T00:00:00.000Z`);

    const rows = await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventId, estaActivo: 1, fechaActividad: { gte: fromDay } },
      orderBy: [...PROGRAMME_ORDER],
      take: limit,
      select: ACTIVITY_SELECT,
    });
    return rows.map(toActivity);
  }

  async listWithAnnouncements(eventId: number): Promise<LiveActivity[]> {
    const rows = await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: [...PROGRAMME_ORDER],
      select: {
        ...ACTIVITY_SELECT,
        anuncios: {
          where: { estaActivo: 1 },
          orderBy: { fechaCreacion: 'desc' },
          take: ANNOUNCEMENTS_PER_ACTIVITY,
          select: {
            id: true,
            mensaje: true,
            fechaCreacion: true,
            usuario: { select: { nombres: true, apellidoPaterno: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      ...toActivity(row),
      anuncios: row.anuncios.map(toAnnouncement),
    }));
  }

  async findActivity(activityId: number, eventId: number): Promise<ActivityRecord | null> {
    const row = await this.prisma.actividadprograma.findFirst({
      where: { id: activityId, evento_id: eventId, estaActivo: 1 },
      select: ACTIVITY_SELECT,
    });
    return row ? toActivity(row) : null;
  }

  async findLiveStatus(activityId: number, eventId: number): Promise<LiveStatusSource | null> {
    return this.prisma.actividadprograma.findFirst({
      where: { id: activityId, evento_id: eventId, estaActivo: 1 },
      select: { estadoEnVivo: true, horaInicioReal: true, horaFinReal: true },
    });
  }

  async create(eventId: number, draft: ActivityDraft): Promise<ActivityRecord> {
    const row = await this.prisma.actividadprograma.create({
      data: { evento_id: eventId, estaActivo: 1, ...toColumns(draft) },
      select: ACTIVITY_SELECT,
    });
    return toActivity(row);
  }

  async update(activityId: number, draft: ActivityDraft): Promise<ActivityRecord> {
    const row = await this.prisma.actividadprograma.update({
      where: { id: activityId },
      data: { ...toColumns(draft), creadoModificadoFecha: new Date() },
      select: ACTIVITY_SELECT,
    });
    return toActivity(row);
  }

  async deactivate(activityId: number): Promise<void> {
    await this.prisma.actividadprograma.update({
      where: { id: activityId },
      data: { estaActivo: 0, creadoModificadoFecha: new Date() },
    });
  }

  async applyLiveTransition(activityId: number, transition: LiveTransition): Promise<void> {
    await this.prisma.actividadprograma.update({
      where: { id: activityId },
      data: {
        estadoEnVivo: transition.estadoEnVivo,
        notaEnVivo: transition.notaEnVivo,
        creadoModificadoFecha: new Date(),
        // The real times are written only when the domain decided to seal them.
        ...(transition.horaInicioReal ? { horaInicioReal: transition.horaInicioReal } : {}),
        ...(transition.horaFinReal ? { horaFinReal: transition.horaFinReal } : {}),
      },
    });
  }

  async findEnrollmentEvent(companyEventId: number): Promise<{ eventId: number } | null> {
    const row = await this.prisma.empresaevento.findFirst({
      where: { id: companyEventId, estaActivo: 1 },
      select: { evento_id: true },
    });
    return row ? { eventId: row.evento_id } : null;
  }

  async setSubscription(
    activityId: number,
    companyEventId: number,
    subscribed: boolean,
  ): Promise<void> {
    const estaActivo = subscribed ? 1 : 0;

    await this.prisma.suscripcionactividad.upsert({
      where: {
        actividad_id_empresaevento_id: {
          actividad_id: activityId,
          empresaevento_id: companyEventId,
        },
      },
      create: { actividad_id: activityId, empresaevento_id: companyEventId, estaActivo },
      update: { estaActivo },
    });
  }

  async listSubscribedActivityIds(companyEventId: number): Promise<number[]> {
    const rows = await this.prisma.suscripcionactividad.findMany({
      where: { empresaevento_id: companyEventId, estaActivo: 1 },
      select: { actividad_id: true },
    });
    return rows.map((row) => row.actividad_id);
  }

  async listSubscribers(activityId: number): Promise<number[]> {
    const rows = await this.prisma.suscripcionactividad.findMany({
      where: { actividad_id: activityId, estaActivo: 1 },
      select: { empresaevento_id: true },
    });
    return rows.map((row) => row.empresaevento_id);
  }

  async addAnnouncement(
    activityId: number,
    userId: number,
    mensaje: string,
  ): Promise<ActivityAnnouncement> {
    const row = await this.prisma.anuncioactividad.create({
      data: { actividad_id: activityId, usuario_id: userId, mensaje },
      select: {
        id: true,
        mensaje: true,
        fechaCreacion: true,
        usuario: { select: { nombres: true, apellidoPaterno: true } },
      },
    });
    return toAnnouncement(row);
  }

  async findAnnouncement(
    announcementId: number,
    eventId: number,
  ): Promise<{ id: number; activityId: number } | null> {
    const row = await this.prisma.anuncioactividad.findFirst({
      where: { id: announcementId, estaActivo: 1, actividad: { evento_id: eventId } },
      select: { id: true, actividad_id: true },
    });
    return row ? { id: row.id, activityId: row.actividad_id } : null;
  }

  async deactivateAnnouncement(announcementId: number): Promise<void> {
    await this.prisma.anuncioactividad.update({
      where: { id: announcementId },
      data: { estaActivo: 0 },
    });
  }
}
