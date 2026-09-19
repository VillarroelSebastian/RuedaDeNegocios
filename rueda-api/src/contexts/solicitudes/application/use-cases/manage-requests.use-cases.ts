import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import {
  COMPANY_NOTIFIER_PORT,
  type CompanyNotifierPort,
} from '../../../../shared/application/ports/company-notifier.port.js';
import {
  STAFF_NOTIFIER_PORT,
  type StaffNotifierPort,
} from '../../../../shared/application/ports/staff-notifier.port.js';
import type { TimeWindow } from '../../../../shared/domain/bolivia-time.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { dailyMeetingWindows } from '../../../eventos/domain/services/event-schedule.js';
import { fixedSlots } from '../../../horarios/domain/services/slot-grid.js';
import {
  MEETING_REQUESTS_REPOSITORY,
  type MeetingRequestRecord,
  type MeetingRequestsRepositoryPort,
  type RequestEvent,
} from '../../domain/ports/meeting-requests.repository.port.js';
import {
  assertCanAccept,
  assertCanCancel,
  assertCanEdit,
  assertCanReject,
  assertDifferentCompanies,
  type MeetingType,
  normalizeMeetingType,
  parseProposedWindow,
} from '../../domain/services/request-rules.js';
import {
  SLOT_AVAILABILITY_PORT,
  type SlotAvailabilityPort,
} from '../ports/slot-availability.port.js';
import {
  TABLE_ALLOCATION_PORT,
  type TableAllocationPort,
} from '../ports/table-allocation.port.js';

const NO_EVENT = 'No hay un evento activo';
const NOT_FOUND = 'Solicitud no encontrada o ya procesada';
const OUTSIDE_GRID =
  'El horario o la duración no corresponden a la jornada configurada del evento.';
const SLOT_TAKEN =
  'Ese horario ya no está disponible para una de las empresas. Actualiza la agenda y elige otro.';
const NO_TABLES = 'No hay mesas disponibles para ese horario';
const TABLE_GONE =
  'La mesa seleccionada no pertenece al evento activo o ya no está habilitada.';
const NOT_ENROLLED = 'Empresa no habilitada o no pertenece al evento activo';

export interface CreateRequestCommand {
  /** The company asking, taken from its token. */
  solicitanteId: number;
  /** The membership answering for it, taken from its token. */
  companyUserId: number;
  receptoraId: number;
  tipo: unknown;
  inicio: unknown;
  fin: unknown;
  mesaId?: number;
  mensaje?: string;
}

export interface EditRequestCommand {
  solicitanteId: number;
  tipo: unknown;
  inicio: unknown;
  fin: unknown;
  mesaId?: number;
  mensaje?: string;
}

/** Everything the two writing use cases need to work out before they write. */
interface Booking {
  event: RequestEvent;
  tipoReunion: MeetingType;
  window: TimeWindow;
  mesaId: number | null;
}

@Injectable()
abstract class RequestUseCase {
  constructor(
    @Inject(MEETING_REQUESTS_REPOSITORY)
    protected readonly requests: MeetingRequestsRepositoryPort,
  ) {}

  protected async currentEvent(): Promise<RequestEvent> {
    const event = await this.requests.findPrincipalEvent();
    if (!event) throw new ValidationError(NO_EVENT);
    return event;
  }

  protected async requireRequest(requestId: number): Promise<MeetingRequestRecord> {
    const request = await this.requests.find(requestId);
    if (!request) throw new NotFoundError(NOT_FOUND);
    return request;
  }

  /** Both companies must still be cleared to take part in the event. */
  protected async assertBothEnrolled(
    eventId: number,
    ...companyEventIds: number[]
  ): Promise<void> {
    for (const companyEventId of companyEventIds) {
      const enrolled = await this.requests.findGrantedEnrollment(companyEventId, eventId);
      if (!enrolled) throw new ForbiddenError(NOT_ENROLLED);
    }
  }
}

/**
 * Both writing paths work the same way: the window has to be a real slot of the
 * event, both companies have to be free in it, and a face to face meeting has
 * to land on a table that is still free.
 */
@Injectable()
abstract class BookingUseCase extends RequestUseCase {
  constructor(
    @Inject(MEETING_REQUESTS_REPOSITORY) requests: MeetingRequestsRepositoryPort,
    @Inject(TABLE_ALLOCATION_PORT) protected readonly tables: TableAllocationPort,
    @Inject(SLOT_AVAILABILITY_PORT) protected readonly availability: SlotAvailabilityPort,
    @Inject(CLOCK_PORT) protected readonly clock: ClockPort,
  ) {
    super(requests);
  }

  protected async planBooking(input: {
    solicitanteId: number;
    receptoraId: number;
    tipo: unknown;
    inicio: unknown;
    fin: unknown;
    mesaId?: number;
    exceptRequestId: number | null;
  }): Promise<Booking> {
    const event = await this.currentEvent();
    const tipoReunion = normalizeMeetingType(input.tipo);
    const window = parseProposedWindow(input.inicio, input.fin, this.clock.now());

    // The agenda is a grid, not a free-for-all: a request has to land on one of
    // its slots exactly, or the hour it shows nobody else can see.
    const onGrid = fixedSlots(
      dailyMeetingWindows(event),
      event.duracionReunion,
      event.tiempoEntreReuniones,
    ).some(
      (slot) =>
        slot.inicio.getTime() === window.start.getTime() &&
        slot.fin.getTime() === window.end.getTime(),
    );
    if (!onGrid) throw new ValidationError(OUTSIDE_GRID);

    await this.assertBothEnrolled(event.id, input.solicitanteId, input.receptoraId);

    const free = await this.availability.isSlotAvailable({
      solicitanteId: input.solicitanteId,
      receptoraId: input.receptoraId,
      window,
      exceptRequestId: input.exceptRequestId,
    });
    if (!free) throw new ConflictError(SLOT_TAKEN);

    return {
      event,
      tipoReunion,
      window,
      mesaId: await this.resolveTable(event.id, tipoReunion, window, input),
    };
  }

  /** A virtual meeting takes no table; a face to face one always does. */
  private async resolveTable(
    eventId: number,
    tipoReunion: MeetingType,
    window: TimeWindow,
    input: { mesaId?: number; exceptRequestId: number | null },
  ): Promise<number | null> {
    if (tipoReunion !== 'PRESENCIAL') return null;

    if (!input.mesaId) {
      const picked = await this.tables.pickTable(eventId, window, input.exceptRequestId);
      if (!picked) throw new ConflictError(NO_TABLES);
      return picked;
    }

    const usable = await this.tables.isTableFree(
      eventId,
      input.mesaId,
      window,
      input.exceptRequestId,
    );
    if (!usable) throw new ConflictError(TABLE_GONE);

    return input.mesaId;
  }
}

@Injectable()
export class CreateMeetingRequestUseCase extends BookingUseCase {
  constructor(
    @Inject(MEETING_REQUESTS_REPOSITORY) requests: MeetingRequestsRepositoryPort,
    @Inject(TABLE_ALLOCATION_PORT) tables: TableAllocationPort,
    @Inject(SLOT_AVAILABILITY_PORT) availability: SlotAvailabilityPort,
    @Inject(CLOCK_PORT) clock: ClockPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(requests, tables, availability, clock);
  }

  async execute(command: CreateRequestCommand): Promise<MeetingRequestRecord> {
    assertDifferentCompanies(command.solicitanteId, command.receptoraId);

    const membership = await this.requests.findMembership(
      command.companyUserId,
      command.solicitanteId,
    );
    if (!membership) throw new ForbiddenError('No tienes permiso para esta empresa');

    const booking = await this.planBooking({ ...command, exceptRequestId: null });

    const duplicate = await this.requests.findDuplicate(
      command.solicitanteId,
      command.receptoraId,
      booking.window.start,
    );
    if (duplicate) {
      throw new ConflictError('Ya enviaste una solicitud para ese horario a esta empresa');
    }

    const created = await this.requests.create({
      solicitanteId: command.solicitanteId,
      receptoraId: command.receptoraId,
      companyUserId: command.companyUserId,
      tipoReunion: booking.tipoReunion,
      window: booking.window,
      mesaId: booking.mesaId,
      mensaje: command.mensaje?.trim() || null,
    });

    const sender = await this.requests.companyNameOf(command.solicitanteId);
    await this.companies.notify({
      companyEventId: command.receptoraId,
      tipo: 'solicitud:nueva',
      titulo: 'Nueva solicitud de reunión',
      mensaje: `${sender ?? 'Una empresa'} te envió una solicitud de reunión. Revísala en Solicitudes.`,
      referenciaId: created.id,
      referenciaTabla: 'solicitudreunion',
    });

    return created;
  }
}

@Injectable()
export class EditMeetingRequestUseCase extends BookingUseCase {
  constructor(
    @Inject(MEETING_REQUESTS_REPOSITORY) requests: MeetingRequestsRepositoryPort,
    @Inject(TABLE_ALLOCATION_PORT) tables: TableAllocationPort,
    @Inject(SLOT_AVAILABILITY_PORT) availability: SlotAvailabilityPort,
    @Inject(CLOCK_PORT) clock: ClockPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(requests, tables, availability, clock);
  }

  async execute(
    requestId: number,
    command: EditRequestCommand,
  ): Promise<MeetingRequestRecord> {
    const request = await this.requireRequest(requestId);
    assertCanEdit(request, command.solicitanteId);

    const booking = await this.planBooking({
      solicitanteId: request.solicitanteId,
      receptoraId: request.receptoraId,
      tipo: command.tipo,
      inicio: command.inicio,
      fin: command.fin,
      mesaId: command.mesaId,
      // Its own slot and table are not obstacles to itself.
      exceptRequestId: request.id,
    });

    const updated = await this.requests.update(requestId, {
      tipoReunion: booking.tipoReunion,
      window: booking.window,
      mesaId: booking.mesaId,
      mensaje: command.mensaje?.trim() || null,
    });

    await this.companies.notify({
      companyEventId: request.receptoraId,
      tipo: 'solicitud:editada',
      titulo: 'Solicitud actualizada',
      mensaje:
        'La otra empresa modificó la hora o los detalles de su solicitud. Revísala nuevamente antes de aceptarla.',
      referenciaId: request.id,
      referenciaTabla: 'solicitudreunion',
    });

    return updated;
  }
}

export interface AcceptedRequest {
  reunionId: number;
}

/**
 * Accepting is the moment a meeting is born: the request stops being a proposal
 * and becomes something both companies have to turn up to. The meeting row and
 * the new state of the request are written together, because a meeting without
 * an accepted request — or the other way round — is a schedule nobody can trust.
 */
@Injectable()
export class AcceptMeetingRequestUseCase extends RequestUseCase {
  constructor(
    @Inject(MEETING_REQUESTS_REPOSITORY) requests: MeetingRequestsRepositoryPort,
    @Inject(TABLE_ALLOCATION_PORT) private readonly tables: TableAllocationPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
    @Inject(STAFF_NOTIFIER_PORT) private readonly staff: StaffNotifierPort,
  ) {
    super(requests);
  }

  async execute(requestId: number, receptoraId: number): Promise<AcceptedRequest> {
    const request = await this.requireRequest(requestId);
    assertCanAccept(request, receptoraId);

    const event = await this.currentEvent();
    await this.assertBothEnrolled(event.id, request.solicitanteId, request.receptoraId);

    if (request.inicio.getTime() <= this.clock.now().getTime()) {
      throw new ConflictError(
        'El horario propuesto ya pasó. La empresa solicitante debe editar la solicitud.',
      );
    }

    const window = { start: request.inicio, end: request.fin };
    await this.assertNobodyIsBusy(request, window);

    const mesaId = await this.resolveTable(request, event.id, window);
    const { meetingId } = await this.requests.accept(requestId, event.id, mesaId);

    await this.announce(request, meetingId, mesaId, window, event.id);

    return { reunionId: meetingId };
  }

  private async assertNobodyIsBusy(
    request: MeetingRequestRecord,
    window: TimeWindow,
  ): Promise<void> {
    for (const companyEventId of [request.solicitanteId, request.receptoraId]) {
      if (await this.requests.hasConfirmedMeeting(companyEventId, window)) {
        throw new ConflictError(
          'Una de las empresas ya tiene una reunión confirmada en ese horario. Rechaza esta solicitud y elige otro horario.',
        );
      }
    }
  }

  private async resolveTable(
    request: MeetingRequestRecord,
    eventId: number,
    window: TimeWindow,
  ): Promise<number | null> {
    if (request.tipoReunion !== 'PRESENCIAL') return null;

    // Requests made before tables were chosen up front still have to land
    // somewhere, so one is picked now.
    if (!request.mesaId) {
      const picked = await this.tables.pickTable(eventId, window, request.id);
      if (!picked) throw new ConflictError('No hay mesas disponibles para ese horario.');
      return picked;
    }

    const stillFree = await this.tables.isTableFree(eventId, request.mesaId, window, request.id);
    if (!stillFree) {
      throw new ConflictError(
        'La mesa elegida por la empresa solicitante ya está ocupada. Rechaza esta solicitud y solicita que elijan otro horario o mesa.',
      );
    }

    return request.mesaId;
  }

  private async announce(
    request: MeetingRequestRecord,
    meetingId: number,
    mesaId: number | null,
    window: TimeWindow,
    eventId: number,
  ): Promise<void> {
    await this.companies.notify({
      companyEventId: request.solicitanteId,
      tipo: 'solicitud:aceptada',
      titulo: 'Solicitud aceptada',
      mensaje: 'Tu solicitud de reunión fue aceptada. Revisa el horario en Reuniones.',
      referenciaId: meetingId,
      referenciaTabla: 'reunion',
    });
    await this.companies.notify({
      companyEventId: request.receptoraId,
      tipo: 'solicitud:aceptada',
      titulo: 'Reunión confirmada',
      mensaje: 'Aceptaste una solicitud de reunión. Revisa los detalles en Reuniones.',
      referenciaId: meetingId,
      referenciaTabla: 'reunion',
    });

    // Whoever else wanted that table and hour has to move, and would otherwise
    // only find out when their own request failed.
    if (mesaId) {
      const displaced = await this.requests.listPendingOnTable(request.id, mesaId, window);
      for (const other of displaced) {
        await this.companies.notify({
          companyEventId: other.solicitanteId,
          tipo: 'solicitud:mesa-no-disponible',
          titulo: 'Debes cambiar la mesa de tu solicitud',
          mensaje:
            'Otra reunión confirmó esa mesa y horario. Edita tu solicitud para elegir una mesa u horario disponible.',
          referenciaId: other.id,
          referenciaTabla: 'solicitudreunion',
        });
      }
    }

    if (request.tipoReunion === 'VIRTUAL' && !request.enlaceReunionVirtual) {
      await this.staff.notify({
        eventId,
        tipo: 'staff:reunion-sin-enlace',
        titulo: 'Reunión virtual sin enlace',
        mensaje:
          'Se confirmó una reunión virtual sin enlace. El equipo técnico debe agregarlo antes del inicio.',
        referenciaId: meetingId,
        evitarDuplicadoMinutos: 5,
      });
    }
  }
}

@Injectable()
export class RejectMeetingRequestUseCase extends RequestUseCase {
  constructor(
    @Inject(MEETING_REQUESTS_REPOSITORY) requests: MeetingRequestsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(requests);
  }

  async execute(requestId: number, receptoraId: number, motivo?: string): Promise<void> {
    const request = await this.requireRequest(requestId);
    assertCanReject(request, receptoraId);

    const reason = motivo?.trim() || null;
    await this.requests.reject(requestId, reason);

    await this.companies.notify({
      companyEventId: request.solicitanteId,
      tipo: 'solicitud:rechazada',
      titulo: 'Solicitud rechazada',
      mensaje: `Tu solicitud de reunión fue rechazada.${reason ? ` Motivo: ${reason}` : ''}`,
      referenciaId: request.id,
      referenciaTabla: 'solicitudreunion',
    });
  }
}

@Injectable()
export class CancelMeetingRequestUseCase extends RequestUseCase {
  constructor(
    @Inject(MEETING_REQUESTS_REPOSITORY) requests: MeetingRequestsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(requests);
  }

  async execute(requestId: number, solicitanteId: number): Promise<void> {
    const request = await this.requireRequest(requestId);
    assertCanCancel(request, solicitanteId);

    await this.requests.cancel(requestId);

    await this.companies.notify({
      companyEventId: request.receptoraId,
      tipo: 'solicitud:cancelada',
      titulo: 'Solicitud cancelada',
      mensaje:
        'La empresa solicitante canceló la solicitud de reunión antes de que fuera aceptada.',
      referenciaId: request.id,
      referenciaTabla: 'solicitudreunion',
    });
  }
}
