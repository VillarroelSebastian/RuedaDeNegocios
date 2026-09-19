import type { MeetingMessengerPort } from './application/ports/meeting-messenger.port.js';
import type {
  AutomatedMeeting,
  CompanyBrief,
  MeetingEvent,
  MeetingRecord,
  MeetingResultView,
  MeetingView,
  MeetingsRepositoryPort,
  NewMeeting,
  OwnMeetingView,
  RescheduleProposal,
  StatusChange,
} from './domain/ports/meetings.repository.port.js';
import type { Evaluation } from './domain/services/meeting-evaluation.js';

/**
 * In-memory doubles for the meetings context. They implement the ports
 * literally so the use-case tests exercise real behaviour without a database.
 */

/** Two days of event, 20 minute meetings on the fixed grid of the agenda. */
export const EVENT: MeetingEvent = {
  id: 7,
  startsAt: new Date('2026-11-10T12:00:00.000Z'),
  endsAt: new Date('2026-11-11T22:00:00.000Z'),
  registrationStartsAt: null,
  registrationEndsAt: null,
  meetingHoursJson: JSON.stringify([
    { fecha: '2026-11-10', habilitado: true, rangos: [{ desde: '08:00', hasta: '10:00' }] },
    { fecha: '2026-11-11', habilitado: true, rangos: [{ desde: '08:00', hasta: '10:00' }] },
  ]),
  duracionReunion: 20,
  tiempoEntreReuniones: 10,
};

export const SENDER_ID = 100;
export const RECEIVER_ID = 200;
export const MEETING_ID = 900;

/** The first slot of the grid: 08:00-08:20 local on the opening day. */
export const SLOT_START = '2026-11-10T12:00:00.000Z';
export const SLOT_END = '2026-11-10T12:20:00.000Z';

export function buildMeeting(overrides: Partial<MeetingRecord> = {}): MeetingRecord {
  return {
    id: MEETING_ID,
    requestId: 55,
    eventId: EVENT.id,
    estadoReunion: 'PROGRAMADA',
    tipoReunion: 'PRESENCIAL',
    inicio: new Date(SLOT_START),
    fin: new Date(SLOT_END),
    mesaId: 3,
    enlaceReunionVirtual: null,
    inicioAnticipadoPor: null,
    solicitanteId: SENDER_ID,
    receptoraId: RECEIVER_ID,
    solicitanteNombre: 'Agro Beni',
    receptoraNombre: 'Ganadera Beni',
    ...overrides,
  };
}

export function buildProposal(overrides: Partial<RescheduleProposal> = {}): RescheduleProposal {
  return {
    id: 33,
    reunionId: MEETING_ID,
    solicitadoPorEeId: SENDER_ID,
    tipoReunion: 'PRESENCIAL',
    inicio: new Date('2026-11-10T12:30:00.000Z'),
    fin: new Date('2026-11-10T12:50:00.000Z'),
    mesaId: 3,
    enlaceReunionVirtual: null,
    mensaje: null,
    estado: 'PENDIENTE',
    ...overrides,
  };
}

export const COMPANY: CompanyBrief = {
  id: 1,
  codigo: 'RB-AB-0001',
  nombre: 'Agro Beni',
  rubro: 'Agroindustria',
  urlFotoPerfil: null,
};

export interface FakeMeetingsOptions {
  event?: MeetingEvent | null;
  meeting?: MeetingRecord | null;
  view?: MeetingView | null;
  views?: MeetingView[];
  own?: OwnMeetingView[];
  company?: CompanyBrief | null;
  enrolled?: boolean;
  responsible?: { id: number } | null;
  membership?: { id: number } | null;
  reschedules?: number;
  proposal?: (RescheduleProposal & { meeting: MeetingRecord }) | null;
  contact?: { nombres: string; correo: string } | null;
  ownResult?: { id: number } | null;
  results?: MeetingResultView[];
  /** What each automation query finds, keyed by the question it answers. */
  automation?: {
    reminders?: AutomatedMeeting[];
    dueToStart?: AutomatedMeeting[];
    endingSoon?: AutomatedMeeting[];
    overdue?: AutomatedMeeting[];
    withoutLink?: AutomatedMeeting[];
    withoutLinkSoon?: AutomatedMeeting[];
    teamsSoon?: AutomatedMeeting[];
  };
  /** Raised by `startMeeting`, the way a race with a real start would. */
  startFailure?: Error;
}

export function buildAutomatedMeeting(
  overrides: Partial<AutomatedMeeting> = {},
): AutomatedMeeting {
  return {
    id: MEETING_ID,
    eventId: EVENT.id,
    inicio: new Date(SLOT_START),
    fin: new Date(SLOT_END),
    tipoReunion: 'PRESENCIAL',
    estadoReunion: 'PROGRAMADA',
    numeroMesa: 4,
    enlace: null,
    solicitanteId: SENDER_ID,
    receptoraId: RECEIVER_ID,
    solicitanteNombre: 'Acme',
    receptoraNombre: 'Beta',
    ...overrides,
  };
}

export class FakeMeetingsRepository implements MeetingsRepositoryPort {
  readonly created: NewMeeting[] = [];
  readonly statusChanges: { meetingId: number; change: StatusChange }[] = [];
  readonly cancelled: { meetingId: number; observaciones: string }[] = [];
  readonly started: { meetingId: number; startedAt: Date }[] = [];
  readonly earlyStarts: { meetingId: number; companyEventId: number }[] = [];
  readonly links: { requestId: number; meetingId: number; enlace: string }[] = [];
  readonly evaluations: {
    meetingId: number;
    entries: { calificadora: number; calificada: number; autor: number; evaluation: Evaluation }[];
  }[] = [];
  readonly createdProposals: Omit<RescheduleProposal, 'id' | 'estado'>[] = [];
  readonly rejectedProposals: { changeId: number; motivo: string | null }[] = [];
  readonly appliedProposals: number[] = [];
  readonly remindersSent: number[] = [];
  readonly ownResults: {
    meetingId: number;
    calificadora: number;
    calificada: number;
    autor: number;
    evaluation: Evaluation;
  }[] = [];

  constructor(private readonly options: FakeMeetingsOptions = {}) {}

  async findPrincipalEvent(): Promise<MeetingEvent | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async findGrantedEnrollment(companyEventId: number): Promise<{ id: number } | null> {
    return this.options.enrolled === false ? null : { id: companyEventId };
  }

  async findResponsibleMembership(): Promise<{ id: number } | null> {
    return this.options.responsible === undefined ? { id: 500 } : this.options.responsible;
  }

  async findAnyMembership(): Promise<{ id: number } | null> {
    return this.options.membership === undefined ? { id: 500 } : this.options.membership;
  }

  async findCompany(): Promise<CompanyBrief | null> {
    return this.options.company === undefined ? COMPANY : this.options.company;
  }

  async find(): Promise<MeetingRecord | null> {
    return this.options.meeting === undefined ? buildMeeting() : this.options.meeting;
  }

  async findView(): Promise<MeetingView | null> {
    return this.options.view ?? null;
  }

  async list(): Promise<MeetingView[]> {
    return this.options.views ?? [];
  }

  async listFinished(): Promise<MeetingView[]> {
    return this.options.views ?? [];
  }

  async listOf(): Promise<OwnMeetingView[]> {
    return this.options.own ?? [];
  }

  async listOfCompanyForStaff(): Promise<MeetingView[]> {
    return this.options.views ?? [];
  }

  async listEligibleCompanies(): Promise<CompanyBrief[]> {
    return [COMPANY];
  }

  async listIdleCompanies(): Promise<CompanyBrief[]> {
    return [COMPANY];
  }

  async createMeeting(meeting: NewMeeting): Promise<{ meetingId: number }> {
    this.created.push(meeting);
    return { meetingId: MEETING_ID };
  }

  async changeStatus(meetingId: number, change: StatusChange): Promise<void> {
    this.statusChanges.push({ meetingId, change });
  }

  async cancelMeeting(meetingId: number, observaciones: string): Promise<void> {
    this.cancelled.push({ meetingId, observaciones });
  }

  async startMeeting(meetingId: number, startedAt: Date): Promise<void> {
    if (this.options.startFailure) throw this.options.startFailure;
    this.started.push({ meetingId, startedAt });
  }

  async markEarlyStartRequest(meetingId: number, companyEventId: number): Promise<void> {
    this.earlyStarts.push({ meetingId, companyEventId });
  }

  async setLink(requestId: number, meetingId: number, enlace: string): Promise<void> {
    this.links.push({ requestId, meetingId, enlace });
  }

  async saveEvaluations(
    meetingId: number,
    _finishedAt: Date,
    entries: {
      calificadora: number;
      calificada: number;
      autor: number;
      evaluation: Evaluation;
    }[],
  ): Promise<void> {
    this.evaluations.push({ meetingId, entries });
  }

  async countReschedules(): Promise<number> {
    return this.options.reschedules ?? 0;
  }

  async findPendingReschedule(): Promise<RescheduleProposal | null> {
    return null;
  }

  async findReschedule(): Promise<(RescheduleProposal & { meeting: MeetingRecord }) | null> {
    return this.options.proposal === undefined
      ? { ...buildProposal(), meeting: buildMeeting() }
      : this.options.proposal;
  }

  async createReschedule(
    proposal: Omit<RescheduleProposal, 'id' | 'estado'>,
  ): Promise<RescheduleProposal> {
    this.createdProposals.push(proposal);
    return { ...proposal, id: 33, estado: 'PENDIENTE' };
  }

  async rejectReschedule(changeId: number, motivo: string | null): Promise<void> {
    this.rejectedProposals.push({ changeId, motivo });
  }

  async applyReschedule(changeId: number): Promise<void> {
    this.appliedProposals.push(changeId);
  }

  async findCompanyContact(): Promise<{ nombres: string; correo: string } | null> {
    return this.options.contact === undefined
      ? { nombres: 'Ana', correo: 'ana@test.com' }
      : this.options.contact;
  }

  async findOwnResult(): Promise<{ id: number } | null> {
    return this.options.ownResult === undefined ? null : this.options.ownResult;
  }

  async findMembership(): Promise<{ id: number } | null> {
    return this.options.membership === undefined ? { id: 500 } : this.options.membership;
  }

  async saveOwnResult(result: {
    meetingId: number;
    calificadora: number;
    calificada: number;
    autor: number;
    evaluation: Evaluation;
  }): Promise<{ id: number }> {
    this.ownResults.push(result);
    return { id: 77 };
  }

  async listResultsOf(): Promise<MeetingResultView[]> {
    return this.options.results ?? [];
  }

  async listPendingReminders(): Promise<AutomatedMeeting[]> {
    return this.options.automation?.reminders ?? [];
  }

  async markReminderSent(meetingId: number): Promise<void> {
    this.remindersSent.push(meetingId);
  }

  async listDueToStart(): Promise<AutomatedMeeting[]> {
    return this.options.automation?.dueToStart ?? [];
  }

  async listEndingSoon(): Promise<AutomatedMeeting[]> {
    return this.options.automation?.endingSoon ?? [];
  }

  async listOverdue(): Promise<AutomatedMeeting[]> {
    return this.options.automation?.overdue ?? [];
  }

  async listRemoteWithoutLink(): Promise<AutomatedMeeting[]> {
    return this.options.automation?.withoutLink ?? [];
  }

  async listRemoteWithoutLinkStartingBefore(): Promise<AutomatedMeeting[]> {
    return this.options.automation?.withoutLinkSoon ?? [];
  }

  async listTeamsStartingBefore(): Promise<AutomatedMeeting[]> {
    return this.options.automation?.teamsSoon ?? [];
  }
}

export class FakeMeetingMessenger implements MeetingMessengerPort {
  readonly sent: { correo: string; mensaje: string }[] = [];

  async send(contact: { nombres: string; correo: string }, mensaje: string): Promise<void> {
    this.sent.push({ correo: contact.correo, mensaje });
  }
}

export class FakeTables {
  constructor(private readonly options: { picked?: number | null; free?: boolean } = {}) {}

  async pickTable(): Promise<number | null> {
    return this.options.picked === undefined ? 4 : this.options.picked;
  }

  async isTableFree(): Promise<boolean> {
    return this.options.free ?? true;
  }
}

export class FakeAvailability {
  constructor(private readonly available = true) {}

  async isSlotAvailable(): Promise<boolean> {
    return this.available;
  }
}

export class FakeStaffNotifier {
  readonly sent: { tipo: string; referenciaId: number; mensaje?: string; urgente?: boolean }[] = [];

  async notify(notification: {
    tipo: string;
    referenciaId: number;
    mensaje?: string;
    urgente?: boolean;
  }): Promise<void> {
    this.sent.push({
      tipo: notification.tipo,
      referenciaId: notification.referenciaId,
      mensaje: notification.mensaje,
      urgente: notification.urgente,
    });
  }
}

/** Slot on the fixed grid that follows the first one: 08:30-08:50 local. */
export const NEXT_SLOT_START = '2026-11-10T12:30:00.000Z';
