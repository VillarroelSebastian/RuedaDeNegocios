import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import type { EventScheduleSource } from '../../../eventos/domain/services/event-schedule.js';
import type { MeetingType } from '../services/request-rules.js';

export interface RequestEvent extends EventScheduleSource {
  id: number;
  duracionReunion: number;
  tiempoEntreReuniones: number;
}

/** A request as the rules read it. */
export interface MeetingRequestRecord {
  id: number;
  solicitanteId: number;
  receptoraId: number;
  estadoSolicitud: string;
  tipoReunion: string;
  inicio: Date;
  fin: Date;
  mesaId: number | null;
  /** Set by the event team, never by a company editing its own request. */
  enlaceReunionVirtual: string | null;
}

export interface CompanyBrief {
  id: number;
  codigo: string | null;
  nombre: string;
  rubro: string | null;
  urlFotoPerfil: string | null;
}

/** A request as a company reads it on its own screen. */
export interface MeetingRequestView {
  id: number;
  tipo: string;
  inicio: Date;
  fin: Date;
  estado: string;
  enlace: string | null;
  mensaje: string | null;
  motivo: string | null;
  mesaId: number | null;
  mesa: { id: number; numeroMesa: number } | null;
  fechaCreacion: Date | null;
  esMiSolicitud: boolean;
  solicitanteEeId: number;
  receptoraEeId: number;
  /** Another pending request wants the same table or the same hour. */
  tieneConflicto: boolean;
  solicitante: CompanyBrief | null;
  receptora: CompanyBrief | null;
  reunion: { id: number; estadoReunion: string; numeroMesa: number | null } | null;
}

export interface NewMeetingRequest {
  solicitanteId: number;
  receptoraId: number;
  /** The `empresa_usuario` answering for the request, taken from the token. */
  companyUserId: number;
  tipoReunion: MeetingType;
  window: TimeWindow;
  mesaId: number | null;
  mensaje: string | null;
}

export interface EditedMeetingRequest {
  tipoReunion: MeetingType;
  window: TimeWindow;
  mesaId: number | null;
  mensaje: string | null;
}

export interface MeetingRequestsRepositoryPort {
  findPrincipalEvent(): Promise<RequestEvent | null>;
  /** An enrollment cleared to take part: paid, granted and still active. */
  findGrantedEnrollment(companyEventId: number, eventId: number): Promise<{ id: number } | null>;
  /** The membership belongs to the enrollment it claims to act for. */
  findMembership(companyUserId: number, companyEventId: number): Promise<{ id: number } | null>;

  find(requestId: number): Promise<MeetingRequestRecord | null>;
  /** The same hour asked of the same company again is a double send. */
  findDuplicate(
    solicitanteId: number,
    receptoraId: number,
    start: Date,
  ): Promise<{ id: number } | null>;
  listFor(companyEventId: number, window: TimeWindow): Promise<MeetingRequestView[]>;

  create(request: NewMeetingRequest): Promise<MeetingRequestRecord>;
  update(requestId: number, request: EditedMeetingRequest): Promise<MeetingRequestRecord>;

  /**
   * Turns the request into a meeting in one atomic step, re-checking the table
   * inside the transaction so two acceptances cannot take the same one.
   */
  accept(
    requestId: number,
    eventId: number,
    mesaId: number | null,
  ): Promise<{ meetingId: number }>;
  reject(requestId: number, motivo: string | null): Promise<void>;
  cancel(requestId: number): Promise<void>;

  /** Either company already has a meeting agreed inside the window. */
  hasConfirmedMeeting(companyEventId: number, window: TimeWindow): Promise<boolean>;
  /** Pending requests that wanted the same table and hour, so they can be told. */
  listPendingOnTable(
    requestId: number,
    mesaId: number,
    window: TimeWindow,
  ): Promise<{ id: number; solicitanteId: number }[]>;
  /** The name a company is announced by. */
  companyNameOf(companyEventId: number): Promise<string | null>;
}

export const MEETING_REQUESTS_REPOSITORY = Symbol('MeetingRequestsRepositoryPort');
