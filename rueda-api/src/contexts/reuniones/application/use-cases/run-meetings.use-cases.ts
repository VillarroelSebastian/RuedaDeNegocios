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
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { dailyMeetingWindows, meetingDates } from '../../../eventos/domain/services/event-schedule.js';
import { technicianCandidates } from '../../../horarios/domain/services/slot-grid.js';
import {
  MEETINGS_REPOSITORY,
  type MeetingRecord,
  type MeetingsRepositoryPort,
} from '../../domain/ports/meetings.repository.port.js';
import {
  normalizeMeetingLink,
  sanitizeEvaluationPair,
  type EvaluationPairInput,
} from '../../domain/services/meeting-evaluation.js';
import {
  assertTransition,
  isLive,
  normalizeMeetingStatus,
} from '../../domain/services/meeting-status.js';
import {
  MEETING_MESSENGER_PORT,
  type MeetingMessengerPort,
} from '../ports/meeting-messenger.port.js';
import {
  TABLE_ALLOCATION_PORT,
  type TableAllocationPort,
} from '../../../solicitudes/application/ports/table-allocation.port.js';

const NO_EVENT = 'No hay un evento activo';
const NOT_FOUND = 'Reunión no encontrada';
const NOT_IN_EVENT = 'Reunión no encontrada en el evento activo';

export interface CreateMeetingCommand {
  solicitanteId: number;
  receptoraId: number;
  tipo: unknown;
  inicio: unknown;
  mesaId?: number;
  enlace?: string;
  mensaje?: string;
}

export interface CreatedMeeting {
  reunionId: number;
  inicio: string;
  fin: string;
}

@Injectable()
abstract class StaffMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) protected readonly meetings: MeetingsRepositoryPort,
  ) {}

  protected async requireMeeting(meetingId: number): Promise<MeetingRecord> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) throw new ValidationError(NO_EVENT);

    const meeting = await this.meetings.find(meetingId, event.id);
    if (!meeting) throw new NotFoundError(NOT_FOUND);

    return meeting;
  }
}

/**
 * The event team booking a meeting outright. Unlike a company, it works on its
 * own day — any five minute mark of an event day — and the meeting is born
 * already agreed, so no request has to be answered.
 */
@Injectable()
export class CreateMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort,
    @Inject(TABLE_ALLOCATION_PORT) private readonly tables: TableAllocationPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
    @Inject(STAFF_NOTIFIER_PORT) private readonly staff: StaffNotifierPort,
  ) {}

  async execute(command: CreateMeetingCommand): Promise<CreatedMeeting> {
    if (command.solicitanteId === command.receptoraId) {
      throw new ValidationError('Elige dos empresas distintas');
    }

    const event = await this.meetings.findPrincipalEvent();
    if (!event) throw new ValidationError(NO_EVENT);

    const tipoReunion = this.readType(command.tipo);
    const window = this.readWindow(command.inicio, event.duracionReunion);

    const onGrid = technicianCandidates(meetingDates(event), event.duracionReunion).some(
      (slot) => slot.inicio.getTime() === window.start.getTime(),
    );
    if (!onGrid || dailyMeetingWindows(event).length === 0) {
      throw new ValidationError(
        'El horario debe ser futuro y pertenecer a un día configurado del evento.',
      );
    }

    for (const companyEventId of [command.solicitanteId, command.receptoraId]) {
      const enrolled = await this.meetings.findGrantedEnrollment(companyEventId, event.id);
      if (!enrolled) {
        throw new ConflictError('Empresa no habilitada o no pertenece al evento activo');
      }
    }

    const enlaceReunionVirtual =
      tipoReunion === 'VIRTUAL' ? normalizeMeetingLink(command.enlace, { allowEmpty: true }) : null;

    const mesaId = await this.resolveTable(event.id, tipoReunion, window, command.mesaId);

    // The booking is signed by whoever answers for the first company.
    const responsible = await this.meetings.findResponsibleMembership(command.solicitanteId);
    if (!responsible) {
      throw new ConflictError('La primera empresa no tiene un encargado registrado');
    }

    const { meetingId } = await this.meetings.createMeeting({
      eventId: event.id,
      solicitanteId: command.solicitanteId,
      receptoraId: command.receptoraId,
      companyUserId: responsible.id,
      tipoReunion,
      window,
      mesaId,
      enlaceReunionVirtual,
      mensaje: command.mensaje?.trim() || 'Reunión agendada por el equipo técnico del evento',
    });

    await this.announce(command, meetingId, window.start, event.id, tipoReunion, enlaceReunionVirtual);

    return {
      reunionId: meetingId,
      inicio: window.start.toISOString(),
      fin: window.end.toISOString(),
    };
  }

  private readType(value: unknown): string {
    const tipo = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!['PRESENCIAL', 'VIRTUAL'].includes(tipo)) {
      throw new ValidationError('El tipo de reunión debe ser PRESENCIAL o VIRTUAL');
    }
    return tipo;
  }

  /** The team gives only a start; the event's own duration sets the end. */
  private readWindow(inicio: unknown, durationMinutes: number) {
    const start = new Date(typeof inicio === 'string' ? inicio : '');
    if (Number.isNaN(start.getTime()) || start.getTime() <= this.clock.now().getTime()) {
      throw new ValidationError(
        'El horario debe ser futuro y pertenecer a un día configurado del evento.',
      );
    }

    return { start, end: new Date(start.getTime() + durationMinutes * 60_000) };
  }

  private async resolveTable(
    eventId: number,
    tipoReunion: string,
    window: { start: Date; end: Date },
    chosen?: number,
  ): Promise<number | null> {
    if (tipoReunion !== 'PRESENCIAL') return null;

    if (!chosen) {
      const picked = await this.tables.pickTable(eventId, window, null);
      if (!picked) throw new ConflictError('No hay mesas disponibles para ese horario');
      return picked;
    }

    const free = await this.tables.isTableFree(eventId, chosen, window, null);
    if (!free) throw new ConflictError('La mesa seleccionada ya está ocupada en ese horario');

    return chosen;
  }

  private async announce(
    command: CreateMeetingCommand,
    meetingId: number,
    startsAt: Date,
    eventId: number,
    tipoReunion: string,
    enlace: string | null,
  ): Promise<void> {
    for (const companyEventId of [command.solicitanteId, command.receptoraId]) {
      await this.companies.notify({
        companyEventId,
        tipo: 'reunion:agendada',
        titulo: 'Reunión agendada por el evento',
        mensaje: `El equipo técnico agendó una reunión para el ${startsAt.toISOString()}. Revisa los detalles en Reuniones.`,
        referenciaId: meetingId,
        referenciaTabla: 'reunion',
      });
    }

    if (tipoReunion === 'VIRTUAL' && !enlace) {
      await this.staff.notify({
        eventId,
        tipo: 'staff:reunion-sin-enlace',
        titulo: 'Reunión virtual sin enlace',
        mensaje:
          'El equipo técnico agendó una reunión virtual sin enlace. Debe completarse antes del inicio.',
        referenciaId: meetingId,
        evitarDuplicadoMinutos: 5,
      });
    }
  }
}

export interface StatusCommand {
  estadoReunion: unknown;
  observaciones?: string;
  asistentes?: number;
}

/**
 * The event team moving a meeting along. Replaces the two legacy endpoints that
 * did this — one enforced the transitions and the other wrote whatever it was
 * given; only the first is honest about what a meeting can do.
 */
@Injectable()
export class ChangeMeetingStatusUseCase extends StaffMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(meetings);
  }

  async execute(meetingId: number, command: StatusCommand): Promise<void> {
    const meeting = await this.requireMeeting(meetingId);
    const estadoReunion = normalizeMeetingStatus(command.estadoReunion);
    assertTransition(meeting.estadoReunion, estadoReunion);

    const observaciones = command.observaciones?.trim();

    if (estadoReunion === 'CANCELADA') {
      await this.meetings.cancelMeeting(
        meetingId,
        observaciones ? `Cancelada por el equipo del evento. Motivo: ${observaciones}` : 'Cancelada por el equipo del evento.',
      );
      await this.tellBoth(meeting, meetingId, observaciones);
      return;
    }

    await this.meetings.changeStatus(meetingId, {
      estadoReunion,
      observaciones,
      asistentes: command.asistentes,
      finReal: estadoReunion === 'FINALIZADA' ? this.clock.now() : undefined,
    });

    if (estadoReunion === 'FINALIZADA') await this.askForResults(meeting, meetingId);
  }

  private async tellBoth(
    meeting: MeetingRecord,
    meetingId: number,
    observaciones?: string,
  ): Promise<void> {
    const detalle = observaciones ? ` Motivo: ${observaciones}` : '';
    for (const companyEventId of [meeting.solicitanteId, meeting.receptoraId]) {
      await this.companies.notify({
        companyEventId,
        tipo: 'reunion:cancelada',
        titulo: 'Reunión cancelada por el equipo del evento',
        mensaje: `El equipo del evento canceló una reunión programada.${detalle}`,
        referenciaId: meetingId,
        referenciaTabla: 'reunion',
      });
    }
  }

  private async askForResults(meeting: MeetingRecord, meetingId: number): Promise<void> {
    for (const companyEventId of [meeting.solicitanteId, meeting.receptoraId]) {
      await this.companies.notifyOnce({
        companyEventId,
        tipo: 'reunion:calificar',
        titulo: 'Califica tu reunión',
        mensaje:
          'Tu reunión terminó. Registra el resultado: calificación, rango de acuerdo y observaciones en la sección Resultados.',
        referenciaId: meetingId,
        referenciaTabla: 'reunion',
      });
    }
  }
}

/** The link of a virtual meeting, which only the event team fills in. */
@Injectable()
export class SetMeetingLinkUseCase extends StaffMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(meetings);
  }

  async execute(meetingId: number, enlace: unknown): Promise<{ enlace: string }> {
    const meeting = await this.requireMeeting(meetingId);
    if (meeting.tipoReunion !== 'VIRTUAL') {
      throw new NotFoundError('Reunión virtual no encontrada');
    }
    if (!isLive(meeting.estadoReunion)) {
      throw new ConflictError(
        'No se puede modificar el enlace de una reunión finalizada o cancelada',
      );
    }

    const link = normalizeMeetingLink(enlace)!;
    await this.meetings.setLink(meeting.requestId, meetingId, link);

    for (const companyEventId of [meeting.solicitanteId, meeting.receptoraId]) {
      await this.companies.notify({
        companyEventId,
        tipo: 'reunion:enlace-actualizado',
        titulo: 'Enlace virtual disponible',
        mensaje:
          'El equipo técnico agregó el enlace de tu reunión virtual. Ya puedes abrirlo desde Mis reuniones.',
        referenciaId: meetingId,
        referenciaTabla: 'reunion',
      });
    }

    return { enlace: link };
  }
}

/** A note the event team sends to one of the two companies of a meeting. */
@Injectable()
export class MessageMeetingCompanyUseCase extends StaffMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(MEETING_MESSENGER_PORT) private readonly messenger: MeetingMessengerPort,
  ) {
    super(meetings);
  }

  async execute(meetingId: number, lado: 'A' | 'B', mensaje: unknown): Promise<void> {
    const text = typeof mensaje === 'string' ? mensaje.trim() : '';
    if (!text) throw new ValidationError('El mensaje no puede estar vacío');

    const meeting = await this.requireMeeting(meetingId);
    const companyEventId = lado === 'A' ? meeting.solicitanteId : meeting.receptoraId;

    const contact = await this.meetings.findCompanyContact(companyEventId);
    if (!contact) throw new NotFoundError('No se encontró el encargado de la empresa');

    await this.messenger.send(contact, text);
  }
}

/**
 * The event team closing a meeting on behalf of both companies, recording what
 * each of them got out of it. Used when the companies leave without filling in
 * their own results.
 */
@Injectable()
export class EvaluateMeetingUseCase extends StaffMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {
    super(meetings);
  }

  async execute(meetingId: number, input: EvaluationPairInput): Promise<void> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) throw new ValidationError(NO_EVENT);

    const meeting = await this.meetings.find(meetingId, event.id);
    if (!meeting) throw new NotFoundError(NOT_IN_EVENT);
    if (meeting.estadoReunion !== 'EN_CURSO') {
      throw new ConflictError('La reunión no está en curso o no pertenece al evento activo');
    }

    const [first, second] = sanitizeEvaluationPair(input);

    const [authorA, authorB] = await Promise.all([
      this.meetings.findAnyMembership(meeting.solicitanteId),
      this.meetings.findAnyMembership(meeting.receptoraId),
    ]);
    if (!authorA || !authorB) {
      throw new ConflictError('Ambas empresas necesitan al menos un participante activo');
    }

    await this.meetings.saveEvaluations(meetingId, this.clock.now(), [
      {
        calificadora: meeting.solicitanteId,
        calificada: meeting.receptoraId,
        autor: authorA.id,
        evaluation: first,
      },
      {
        calificadora: meeting.receptoraId,
        calificada: meeting.solicitanteId,
        autor: authorB.id,
        evaluation: second,
      },
    ]);
  }
}
