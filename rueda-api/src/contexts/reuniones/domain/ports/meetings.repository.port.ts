import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import type { EventScheduleSource } from '../../../eventos/domain/services/event-schedule.js';
import type { Evaluation } from '../services/meeting-evaluation.js';

export interface MeetingEvent extends EventScheduleSource {
  id: number;
  duracionReunion: number;
  tiempoEntreReuniones: number;
}

/** A meeting as the rules read it. */
export interface MeetingRecord {
  id: number;
  requestId: number;
  eventId: number;
  estadoReunion: string;
  tipoReunion: string;
  inicio: Date;
  fin: Date;
  mesaId: number | null;
  enlaceReunionVirtual: string | null;
  /** The enrollment that asked to start before the hour, if any. */
  inicioAnticipadoPor: number | null;
  solicitanteId: number;
  receptoraId: number;
  solicitanteNombre: string | null;
  receptoraNombre: string | null;
}

export interface CompanyBrief {
  id: number;
  codigo: string | null;
  nombre: string;
  rubro: string | null;
  urlFotoPerfil: string | null;
}

/** A meeting as the staff board shows it. */
export interface MeetingView {
  id: number;
  tipo: string;
  estado: string;
  inicio: Date;
  fin: Date;
  inicioReal: Date | null;
  finReal: Date | null;
  observaciones: string | null;
  enlace: string | null;
  mesa: { id: number; numeroMesa: number } | null;
  solicitante: CompanyBrief | null;
  receptora: CompanyBrief | null;
  resultados: {
    id: number;
    empresaeventoCalificadora_id: number;
    calificacionReunion: number;
    rangoAcuerdoComercial: string;
    observacionesPuntosTratados: string | null;
  }[];
}

/** A meeting as the company that takes part in it sees it. */
export interface OwnMeetingView {
  id: number;
  tipo: string;
  estado: string;
  inicio: Date;
  fin: Date;
  mesa: { id: number; numeroMesa: number } | null;
  /** Only handed out once the meeting is actually running. */
  enlace: string | null;
  enlaceConfigurado: boolean;
  mensaje: string | null;
  contraparte: CompanyBrief | null;
  miResultado: {
    id: number;
    calificacionReunion: number;
    rangoAcuerdoComercial: string;
  } | null;
  solicitanteEeId: number;
  receptoraEeId: number;
  /** True when the caller is the company that asked for the meeting. */
  yoSolicite: boolean;
  cambioPendiente: RescheduleProposal | null;
  inicioAnticipadoPor: number | null;
}

export interface RescheduleProposal {
  id: number;
  reunionId: number;
  solicitadoPorEeId: number;
  tipoReunion: string;
  inicio: Date;
  fin: Date;
  mesaId: number | null;
  enlaceReunionVirtual: string | null;
  mensaje: string | null;
  estado: string;
}

/** A result as the company that wrote it reads it back. */
export interface MeetingResultView {
  id: number;
  calificacionReunion: number;
  rangoAcuerdoComercial: string;
  observacionesPuntosTratados: string;
  fechaCreacion: Date;
  contraparte: { id: number; nombre: string } | null;
  reunion: {
    id: number;
    inicio: Date;
    fin: Date;
    tipo: string;
    estado: string;
    numeroMesa: number | null;
  };
}

export interface MeetingFilters {
  q?: string;
  estado?: string;
  tipo?: string;
}

export interface NewMeeting {
  eventId: number;
  solicitanteId: number;
  receptoraId: number;
  /** The membership the booking is signed with. */
  companyUserId: number;
  tipoReunion: string;
  window: TimeWindow;
  mesaId: number | null;
  enlaceReunionVirtual: string | null;
  mensaje: string;
}

export interface StatusChange {
  estadoReunion: string;
  observaciones?: string;
  asistentes?: number;
  /** Set when the change is what ends the meeting. */
  finReal?: Date;
}

/**
 * A meeting as the automation reads it: enough to notify both sides and to
 * decide whether it may start, without loading the whole aggregate.
 */
export interface AutomatedMeeting {
  id: number;
  eventId: number;
  inicio: Date;
  fin: Date;
  tipoReunion: string;
  estadoReunion: string;
  numeroMesa: number | null;
  enlace: string | null;
  solicitanteId: number | null;
  receptoraId: number | null;
  solicitanteNombre: string | null;
  receptoraNombre: string | null;
}

export interface MeetingsRepositoryPort {
  findPrincipalEvent(): Promise<MeetingEvent | null>;
  findGrantedEnrollment(companyEventId: number, eventId: number): Promise<{ id: number } | null>;
  /** The person a booking made by the staff is signed by. */
  findResponsibleMembership(companyEventId: number): Promise<{ id: number } | null>;
  /** One active member of each company, needed to sign an evaluation. */
  findAnyMembership(companyEventId: number): Promise<{ id: number } | null>;
  findCompany(companyEventId: number, eventId: number): Promise<CompanyBrief | null>;

  find(meetingId: number, eventId: number): Promise<MeetingRecord | null>;
  findView(meetingId: number, eventId: number): Promise<MeetingView | null>;
  list(eventId: number, window: TimeWindow, filters: MeetingFilters): Promise<MeetingView[]>;
  listFinished(eventId: number, window: TimeWindow, q?: string): Promise<MeetingView[]>;
  listOf(companyEventId: number, window: TimeWindow): Promise<OwnMeetingView[]>;
  listOfCompanyForStaff(companyEventId: number, eventId: number): Promise<MeetingView[]>;
  /** Enrollments cleared to take part, whether or not they are meeting now. */
  listEligibleCompanies(eventId: number): Promise<CompanyBrief[]>;
  /** Enrollments not sitting in a meeting right now. */
  listIdleCompanies(eventId: number): Promise<CompanyBrief[]>;

  /** Creates the accepted request and its meeting in one atomic step. */
  createMeeting(meeting: NewMeeting): Promise<{ meetingId: number }>;
  changeStatus(meetingId: number, change: StatusChange): Promise<void>;
  /** Cancels the meeting, its request and the table block it held. */
  cancelMeeting(meetingId: number, observaciones: string): Promise<void>;
  /** Marks the meeting as running, refusing a second start. */
  startMeeting(meetingId: number, startedAt: Date): Promise<void>;
  markEarlyStartRequest(meetingId: number, companyEventId: number): Promise<void>;
  setLink(requestId: number, meetingId: number, enlace: string): Promise<void>;
  saveEvaluations(
    meetingId: number,
    finishedAt: Date,
    evaluations: { calificadora: number; calificada: number; autor: number; evaluation: Evaluation }[],
  ): Promise<void>;

  // What the event does on its own, without anybody pressing a button.

  /** Scheduled meetings starting soon whose reminder was never sent. */
  listPendingReminders(
    eventId: number,
    window: TimeWindow,
    until: Date,
  ): Promise<AutomatedMeeting[]>;
  /** Flags the reminder as sent, so it goes out exactly once. */
  markReminderSent(meetingId: number): Promise<void>;

  /** Scheduled meetings whose hour arrived and that are not running yet. */
  listDueToStart(eventId: number, window: TimeWindow, now: Date): Promise<AutomatedMeeting[]>;
  /** Running meetings that end within the given instant. */
  listEndingSoon(
    eventId: number,
    window: TimeWindow,
    now: Date,
    until: Date,
  ): Promise<AutomatedMeeting[]>;
  /** Live meetings whose end time already passed. */
  listOverdue(eventId: number, window: TimeWindow, now: Date): Promise<AutomatedMeeting[]>;

  /** Scheduled remote meetings still to happen that have no link yet. */
  listRemoteWithoutLink(eventId: number, window: TimeWindow, now: Date): Promise<AutomatedMeeting[]>;
  /** The same, narrowed to the ones starting before the given instant. */
  listRemoteWithoutLinkStartingBefore(
    eventId: number,
    window: TimeWindow,
    now: Date,
    until: Date,
  ): Promise<AutomatedMeeting[]>;
  /** Scheduled meetings on Teams starting before the given instant. */
  listTeamsStartingBefore(
    eventId: number,
    window: TimeWindow,
    now: Date,
    until: Date,
  ): Promise<AutomatedMeeting[]>;

  countReschedules(meetingId: number): Promise<number>;
  findPendingReschedule(meetingId: number): Promise<RescheduleProposal | null>;
  findReschedule(changeId: number): Promise<(RescheduleProposal & { meeting: MeetingRecord }) | null>;
  createReschedule(proposal: Omit<RescheduleProposal, 'id' | 'estado'>): Promise<RescheduleProposal>;
  rejectReschedule(changeId: number, motivo: string | null): Promise<void>;
  /** Applies the agreed change to the meeting, its request and its table block. */
  applyReschedule(changeId: number): Promise<void>;

  /** The address a company is written to at. */
  findCompanyContact(
    companyEventId: number,
  ): Promise<{ nombres: string; correo: string } | null>;

  /** The result this company already recorded for the meeting, if any. */
  findOwnResult(meetingId: number, companyEventId: number): Promise<{ id: number } | null>;
  /** The membership belongs to the enrollment it claims to record for. */
  findMembership(companyUserId: number, companyEventId: number): Promise<{ id: number } | null>;
  saveOwnResult(result: {
    meetingId: number;
    calificadora: number;
    calificada: number;
    autor: number;
    evaluation: Evaluation;
  }): Promise<{ id: number }>;
  listResultsOf(companyEventId: number): Promise<MeetingResultView[]>;
}

export const MEETINGS_REPOSITORY = Symbol('MeetingsRepositoryPort');
