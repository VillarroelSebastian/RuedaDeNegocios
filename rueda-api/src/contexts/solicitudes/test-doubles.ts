import type { TimeWindow } from '../../shared/domain/bolivia-time.js';
import type { SlotAvailabilityPort } from './application/ports/slot-availability.port.js';
import type { TableAllocationPort } from './application/ports/table-allocation.port.js';
import type {
  EditedMeetingRequest,
  MeetingRequestRecord,
  MeetingRequestView,
  MeetingRequestsRepositoryPort,
  NewMeetingRequest,
  RequestEvent,
} from './domain/ports/meeting-requests.repository.port.js';

/**
 * In-memory doubles for the meeting requests context. They implement the ports
 * literally so the use-case tests exercise real behaviour without a database.
 */

/** Two days of event, 20 minute meetings on the hour with a 10 minute break. */
export const EVENT: RequestEvent = {
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
export const MEMBERSHIP_ID = 500;

/** The first slot of the grid: 08:00-08:20 local on the opening day. */
export const SLOT_START = '2026-11-10T12:00:00.000Z';
export const SLOT_END = '2026-11-10T12:20:00.000Z';

export function buildRequest(overrides: Partial<MeetingRequestRecord> = {}): MeetingRequestRecord {
  return {
    id: 55,
    solicitanteId: SENDER_ID,
    receptoraId: RECEIVER_ID,
    estadoSolicitud: 'PENDIENTE',
    tipoReunion: 'PRESENCIAL',
    inicio: new Date(SLOT_START),
    fin: new Date(SLOT_END),
    mesaId: 3,
    enlaceReunionVirtual: null,
    ...overrides,
  };
}

export interface FakeRequestsOptions {
  event?: RequestEvent | null;
  request?: MeetingRequestRecord | null;
  enrolled?: boolean;
  membership?: { id: number } | null;
  duplicate?: { id: number } | null;
  views?: MeetingRequestView[];
  confirmedMeeting?: boolean;
  pendingOnTable?: { id: number; solicitanteId: number }[];
  companyName?: string | null;
}

export class FakeMeetingRequestsRepository implements MeetingRequestsRepositoryPort {
  readonly created: NewMeetingRequest[] = [];
  readonly updated: { requestId: number; request: EditedMeetingRequest }[] = [];
  readonly accepted: { requestId: number; eventId: number; mesaId: number | null }[] = [];
  readonly rejected: { requestId: number; motivo: string | null }[] = [];
  readonly cancelled: number[] = [];

  constructor(private readonly options: FakeRequestsOptions = {}) {}

  async findPrincipalEvent(): Promise<RequestEvent | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async findGrantedEnrollment(companyEventId: number): Promise<{ id: number } | null> {
    return this.options.enrolled === false ? null : { id: companyEventId };
  }

  async findMembership(): Promise<{ id: number } | null> {
    return this.options.membership === undefined ? { id: MEMBERSHIP_ID } : this.options.membership;
  }

  async find(): Promise<MeetingRequestRecord | null> {
    return this.options.request === undefined ? buildRequest() : this.options.request;
  }

  async findDuplicate(): Promise<{ id: number } | null> {
    return this.options.duplicate ?? null;
  }

  async listFor(): Promise<MeetingRequestView[]> {
    return this.options.views ?? [];
  }

  async create(request: NewMeetingRequest): Promise<MeetingRequestRecord> {
    this.created.push(request);
    return buildRequest({
      id: 99,
      tipoReunion: request.tipoReunion,
      inicio: request.window.start,
      fin: request.window.end,
      mesaId: request.mesaId,
    });
  }

  async update(requestId: number, request: EditedMeetingRequest): Promise<MeetingRequestRecord> {
    this.updated.push({ requestId, request });
    return buildRequest({
      id: requestId,
      tipoReunion: request.tipoReunion,
      inicio: request.window.start,
      fin: request.window.end,
      mesaId: request.mesaId,
    });
  }

  async accept(
    requestId: number,
    eventId: number,
    mesaId: number | null,
  ): Promise<{ meetingId: number }> {
    this.accepted.push({ requestId, eventId, mesaId });
    return { meetingId: 900 };
  }

  async reject(requestId: number, motivo: string | null): Promise<void> {
    this.rejected.push({ requestId, motivo });
  }

  async cancel(requestId: number): Promise<void> {
    this.cancelled.push(requestId);
  }

  async hasConfirmedMeeting(): Promise<boolean> {
    return this.options.confirmedMeeting ?? false;
  }

  async listPendingOnTable(): Promise<{ id: number; solicitanteId: number }[]> {
    return this.options.pendingOnTable ?? [];
  }

  async companyNameOf(): Promise<string | null> {
    return this.options.companyName === undefined ? 'Agro Beni' : this.options.companyName;
  }
}

export class FakeTableAllocation implements TableAllocationPort {
  readonly picks: { window: TimeWindow; exceptRequestId: number | null }[] = [];

  constructor(
    private readonly options: { picked?: number | null; free?: boolean } = {},
  ) {}

  async pickTable(
    _eventId: number,
    window: TimeWindow,
    exceptRequestId: number | null,
  ): Promise<number | null> {
    this.picks.push({ window, exceptRequestId });
    return this.options.picked === undefined ? 4 : this.options.picked;
  }

  async isTableFree(): Promise<boolean> {
    return this.options.free ?? true;
  }
}

export class FakeSlotAvailability implements SlotAvailabilityPort {
  readonly asked: { solicitanteId: number; receptoraId: number; exceptRequestId: number | null }[] =
    [];

  constructor(private readonly available = true) {}

  async isSlotAvailable(input: {
    solicitanteId: number;
    receptoraId: number;
    window: TimeWindow;
    exceptRequestId: number | null;
  }): Promise<boolean> {
    this.asked.push({
      solicitanteId: input.solicitanteId,
      receptoraId: input.receptoraId,
      exceptRequestId: input.exceptRequestId,
    });
    return this.available;
  }
}

export class FakeStaffNotifier {
  readonly sent: { tipo: string; referenciaId: number }[] = [];

  async notify(notification: { tipo: string; referenciaId: number }): Promise<void> {
    this.sent.push({ tipo: notification.tipo, referenciaId: notification.referenciaId });
  }
}
