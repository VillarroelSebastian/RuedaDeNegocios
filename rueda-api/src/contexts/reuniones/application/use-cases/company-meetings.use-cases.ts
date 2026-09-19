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
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { dailyMeetingWindows } from '../../../eventos/domain/services/event-schedule.js';
import { fixedSlots } from '../../../horarios/domain/services/slot-grid.js';
import {
  SLOT_AVAILABILITY_PORT,
  type SlotAvailabilityPort,
} from '../../../solicitudes/application/ports/slot-availability.port.js';
import {
  TABLE_ALLOCATION_PORT,
  type TableAllocationPort,
} from '../../../solicitudes/application/ports/table-allocation.port.js';
import {
  MEETINGS_REPOSITORY,
  type MeetingEvent,
  type MeetingRecord,
  type MeetingsRepositoryPort,
  type RescheduleProposal,
} from '../../domain/ports/meetings.repository.port.js';
import { planStart } from '../../domain/services/early-start.js';
import { isLive } from '../../domain/services/meeting-status.js';

const NO_EVENT = 'No hay un evento activo';
const CANNOT_CANCEL = 'Reunión no encontrada o ya no se puede cancelar';
const MAX_REASON_LENGTH = 300;

@Injectable()
abstract class OwnMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) protected readonly meetings: MeetingsRepositoryPort,
  ) {}

  protected async currentEvent(): Promise<MeetingEvent> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) throw new ValidationError(NO_EVENT);
    return event;
  }

  /** A meeting the caller is actually part of; anything else is not theirs. */
  protected async requireOwn(
    meetingId: number,
    companyEventId: number,
    notFound: string,
  ): Promise<{ meeting: MeetingRecord; event: MeetingEvent }> {
    const event = await this.currentEvent();

    const meeting = await this.meetings.find(meetingId, event.id);
    if (!meeting) throw new NotFoundError(notFound);
    if (![meeting.solicitanteId, meeting.receptoraId].includes(companyEventId)) {
      throw new ForbiddenError('No tienes permiso para esta reunión');
    }

    return { meeting, event };
  }

  protected counterpartOf(meeting: MeetingRecord, companyEventId: number): number {
    return meeting.solicitanteId === companyEventId ? meeting.receptoraId : meeting.solicitanteId;
  }

  protected nameOf(meeting: MeetingRecord, companyEventId: number): string {
    const name =
      meeting.solicitanteId === companyEventId
        ? meeting.solicitanteNombre
        : meeting.receptoraNombre;
    return name ?? 'La otra empresa';
  }
}

/** Either company may call a booked meeting off; the other one is told. */
@Injectable()
export class CancelOwnMeetingUseCase extends OwnMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(meetings);
  }

  async execute(meetingId: number, companyEventId: number, motivo?: string): Promise<void> {
    const { meeting } = await this.requireOwn(meetingId, companyEventId, CANNOT_CANCEL);
    if (!['PROGRAMADA', 'REPROGRAMADA'].includes(meeting.estadoReunion)) {
      throw new ConflictError(CANNOT_CANCEL);
    }

    const who = this.nameOf(meeting, companyEventId);
    const reason = (motivo ?? '').trim().slice(0, MAX_REASON_LENGTH);
    const detail = reason ? ` Motivo: ${reason}` : '';

    await this.meetings.cancelMeeting(meetingId, `Cancelada por ${who}.${detail}`);

    await this.companies.notify({
      companyEventId: this.counterpartOf(meeting, companyEventId),
      tipo: 'reunion:cancelada',
      titulo: 'Reunión cancelada',
      mensaje: `${who} canceló la reunión.${detail} El equipo técnico puede ver la cancelación y ayudarte si es necesario.`,
      referenciaId: meetingId,
      referenciaTabla: 'reunion',
    });
  }
}

export interface StartResult {
  iniciada: boolean;
  esperandoContraparte: boolean;
}

/**
 * Starting a meeting. Once its hour has come one company is enough; before it,
 * both have to press the button.
 */
@Injectable()
export class StartOwnMeetingUseCase extends OwnMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
    @Inject(STAFF_NOTIFIER_PORT) private readonly staff: StaffNotifierPort,
  ) {
    super(meetings);
  }

  async execute(meetingId: number, companyEventId: number): Promise<StartResult> {
    const { meeting } = await this.requireOwn(
      meetingId,
      companyEventId,
      'Reunión no encontrada o ya no se puede iniciar',
    );
    if (!['PROGRAMADA', 'REPROGRAMADA'].includes(meeting.estadoReunion)) {
      throw new ConflictError('Reunión no encontrada o ya no se puede iniciar');
    }

    await this.assertVirtualIsReachable(meeting, companyEventId);

    const plan = planStart({
      scheduledAt: meeting.inicio,
      now: this.clock.now(),
      askedBy: meeting.inicioAnticipadoPor,
      callerId: companyEventId,
    });

    if (plan.accion === 'ESPERAR') return { iniciada: false, esperandoContraparte: true };

    if (plan.accion === 'PEDIR') {
      await this.meetings.markEarlyStartRequest(meetingId, companyEventId);
      await this.companies.notify({
        companyEventId: this.counterpartOf(meeting, companyEventId),
        tipo: 'reunion:inicio-solicitado',
        titulo: 'Quieren iniciar la reunión',
        mensaje: `${this.nameOf(meeting, companyEventId)} quiere iniciar la reunión antes de la hora. Presiona "Iniciar ahora" en Reuniones para aceptar.`,
        referenciaId: meetingId,
        referenciaTabla: 'reunion',
      });
      return { iniciada: false, esperandoContraparte: true };
    }

    await this.meetings.startMeeting(meetingId, this.clock.now());
    await this.tellBoth(meeting, meetingId);

    return { iniciada: true, esperandoContraparte: false };
  }

  /** A virtual meeting with no link is a door with no handle. */
  private async assertVirtualIsReachable(
    meeting: MeetingRecord,
    companyEventId: number,
  ): Promise<void> {
    if (meeting.tipoReunion !== 'VIRTUAL' || meeting.enlaceReunionVirtual) return;

    await this.staff.notify({
      eventId: meeting.eventId,
      tipo: 'staff:reunion-sin-enlace-urgente',
      titulo: 'URGENTE: reunión virtual sin enlace',
      mensaje: `${this.nameOf(meeting, companyEventId)} intentó iniciar una reunión virtual que todavía no tiene enlace.`,
      referenciaId: meeting.id,
      urgente: true,
      evitarDuplicadoMinutos: 2,
    });

    throw new ConflictError(
      'Esta reunión virtual todavía no tiene enlace. Agrégalo o espera a que el equipo técnico lo complete; ya les enviamos una alerta urgente.',
    );
  }

  private async tellBoth(meeting: MeetingRecord, meetingId: number): Promise<void> {
    const mensaje =
      meeting.tipoReunion === 'VIRTUAL'
        ? 'Tu reunión virtual comenzó. Abre esta notificación para acceder al enlace y unirte.'
        : 'Tu reunión comenzó. ¡Éxitos en la negociación!';

    for (const companyEventId of [meeting.solicitanteId, meeting.receptoraId]) {
      await this.companies.notify({
        companyEventId,
        tipo: 'reunion:iniciada',
        titulo: 'Reunión iniciada',
        mensaje,
        referenciaId: meetingId,
        referenciaTabla: 'reunion',
      });
    }
  }
}

/** Either company may close a meeting that is running. */
@Injectable()
export class CompleteOwnMeetingUseCase extends OwnMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(meetings);
  }

  async execute(meetingId: number, companyEventId: number): Promise<void> {
    const { meeting } = await this.requireOwn(
      meetingId,
      companyEventId,
      'Reunión no encontrada o no se puede finalizar',
    );
    if (meeting.estadoReunion !== 'EN_CURSO') {
      throw new ConflictError('Reunión no encontrada o no se puede finalizar');
    }

    await this.meetings.changeStatus(meetingId, {
      estadoReunion: 'FINALIZADA',
      finReal: this.clock.now(),
    });

    for (const target of [meeting.solicitanteId, meeting.receptoraId]) {
      await this.companies.notifyOnce({
        companyEventId: target,
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

export interface RescheduleCommand {
  inicio: unknown;
  tipoReunion?: unknown;
  mensaje?: string;
}

/**
 * A company proposing a new hour. An agreed meeting is not moved unilaterally:
 * the proposal waits for the other company, and only one is allowed per meeting.
 */
@Injectable()
export class ProposeRescheduleUseCase extends OwnMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(TABLE_ALLOCATION_PORT) private readonly tables: TableAllocationPort,
    @Inject(SLOT_AVAILABILITY_PORT) private readonly availability: SlotAvailabilityPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(meetings);
  }

  async execute(
    meetingId: number,
    companyEventId: number,
    command: RescheduleCommand,
  ): Promise<RescheduleProposal> {
    const { meeting, event } = await this.requireOwn(
      meetingId,
      companyEventId,
      'Reunión no encontrada o no tienes permiso para cambiarla',
    );
    if (!['PROGRAMADA', 'REPROGRAMADA'].includes(meeting.estadoReunion)) {
      throw new ConflictError('Reunión no encontrada o no tienes permiso para cambiarla');
    }

    // One change only: an agenda that keeps moving is one nobody can plan around.
    if ((await this.meetings.countReschedules(meetingId)) > 0) {
      throw new ConflictError(
        'Por seguridad, una reunión confirmada solo admite una solicitud de cambio de horario.',
      );
    }

    const window = this.readWindow(command.inicio, event.duracionReunion);
    const onGrid = fixedSlots(
      dailyMeetingWindows(event),
      event.duracionReunion,
      event.tiempoEntreReuniones,
    ).some(
      (slot) =>
        slot.inicio.getTime() === window.start.getTime() &&
        slot.fin.getTime() === window.end.getTime(),
    );
    if (!onGrid) {
      throw new ValidationError(
        'El nuevo horario debe ser futuro y pertenecer a la jornada del evento.',
      );
    }

    const tipoReunion = this.readType(command.tipoReunion ?? meeting.tipoReunion);

    const free = await this.availability.isSlotAvailable({
      solicitanteId: meeting.solicitanteId,
      receptoraId: meeting.receptoraId,
      window,
      exceptRequestId: meeting.requestId,
    });
    if (!free) {
      throw new ConflictError('El nuevo horario ya no está disponible para una de las empresas.');
    }

    const mesaId = await this.resolveTable(event.id, tipoReunion, window, meeting);

    const proposal = await this.meetings.createReschedule({
      reunionId: meetingId,
      solicitadoPorEeId: companyEventId,
      tipoReunion,
      inicio: window.start,
      fin: window.end,
      mesaId,
      enlaceReunionVirtual: meeting.enlaceReunionVirtual,
      mensaje: command.mensaje?.trim().slice(0, 500) || null,
    });

    await this.companies.notify({
      companyEventId: this.counterpartOf(meeting, companyEventId),
      tipo: 'reunion:cambio-solicitado',
      titulo: 'Solicitud de cambio en la reunión',
      mensaje: `La otra empresa solicitó cambios en la reunión (${tipoReunion.toLowerCase()}, ${window.start.toISOString()}). Debes aceptar para que se apliquen.`,
      referenciaId: proposal.id,
      referenciaTabla: 'cambioreunion',
    });

    return proposal;
  }

  private readWindow(inicio: unknown, durationMinutes: number) {
    const start = new Date(typeof inicio === 'string' ? inicio : '');
    if (Number.isNaN(start.getTime()) || start.getTime() <= this.clock.now().getTime()) {
      throw new ValidationError(
        'El nuevo horario debe ser futuro y pertenecer a la jornada del evento.',
      );
    }
    return { start, end: new Date(start.getTime() + durationMinutes * 60_000) };
  }

  private readType(value: unknown): string {
    const tipo = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!['PRESENCIAL', 'VIRTUAL'].includes(tipo)) {
      throw new ValidationError('El tipo de reunión debe ser PRESENCIAL o VIRTUAL');
    }
    return tipo;
  }

  /** The table it already holds if it survives the move, otherwise a new one. */
  private async resolveTable(
    eventId: number,
    tipoReunion: string,
    window: { start: Date; end: Date },
    meeting: MeetingRecord,
  ): Promise<number | null> {
    if (tipoReunion !== 'PRESENCIAL') return null;

    if (meeting.mesaId) {
      const keeps = await this.tables.isTableFree(
        eventId,
        meeting.mesaId,
        window,
        meeting.requestId,
      );
      if (keeps) return meeting.mesaId;
    }

    const picked = await this.tables.pickTable(eventId, window, meeting.requestId);
    if (!picked) throw new ConflictError('No hay mesas disponibles en ese horario');

    return picked;
  }
}

/** The other company answering a proposed change. */
@Injectable()
export class RespondRescheduleUseCase extends OwnMeetingUseCase {
  constructor(
    @Inject(MEETINGS_REPOSITORY) meetings: MeetingsRepositoryPort,
    @Inject(TABLE_ALLOCATION_PORT) private readonly tables: TableAllocationPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {
    super(meetings);
  }

  async execute(
    changeId: number,
    companyEventId: number,
    aceptar: boolean,
    motivo?: string,
  ): Promise<{ estado: string }> {
    const change = await this.meetings.findReschedule(changeId);
    if (!change || change.estado !== 'PENDIENTE') {
      throw new ConflictError('La propuesta ya no está pendiente');
    }

    const parties = [change.meeting.solicitanteId, change.meeting.receptoraId];
    // Only the company that did not ask may answer: agreeing with yourself is
    // not agreement.
    if (!parties.includes(companyEventId) || change.solicitadoPorEeId === companyEventId) {
      throw new ForbiddenError('Solo la contraparte puede responder esta propuesta');
    }

    if (!aceptar) {
      const reason = motivo?.trim() || null;
      await this.meetings.rejectReschedule(changeId, reason);
      await this.companies.notify({
        companyEventId: change.solicitadoPorEeId,
        tipo: 'reunion:cambio-rechazado',
        titulo: 'Cambio rechazado',
        mensaje: `La otra empresa rechazó el cambio propuesto.${reason ? ` Motivo: ${reason}` : ''}`,
        referenciaId: change.reunionId,
        referenciaTabla: 'reunion',
      });
      return { estado: 'RECHAZADA' };
    }

    await this.assertStillPlaceable(change);
    await this.meetings.applyReschedule(changeId);

    const changedMode = change.tipoReunion !== change.meeting.tipoReunion;
    for (const target of parties) {
      await this.companies.notify({
        companyEventId: target,
        tipo: 'reunion:cambio-aceptado',
        titulo: changedMode ? 'Modalidad de reunión cambiada' : 'Cambio de reunión acordado',
        mensaje: changedMode
          ? `Ambas empresas aceptaron el cambio. La modalidad cambió a ${change.tipoReunion.toLowerCase()}; la agenda y la mesa ya fueron actualizadas.`
          : 'Ambas empresas aceptaron el cambio de horario. La agenda y la mesa ya fueron actualizadas.',
        referenciaId: change.reunionId,
        referenciaTabla: 'reunion',
      });
    }

    return { estado: 'ACEPTADA' };
  }

  /** Time passed while the proposal waited, so the table is checked again. */
  private async assertStillPlaceable(
    change: RescheduleProposal & { meeting: MeetingRecord },
  ): Promise<void> {
    if (change.tipoReunion !== 'PRESENCIAL') return;
    if (!isLive(change.meeting.estadoReunion)) {
      throw new ConflictError('La propuesta ya no está pendiente');
    }

    const mesaId = change.mesaId ?? change.meeting.mesaId;
    if (!mesaId) throw new ConflictError('La propuesta presencial no tiene una mesa asignada');

    const free = await this.tables.isTableFree(
      change.meeting.eventId,
      mesaId,
      { start: change.inicio, end: change.fin },
      change.meeting.requestId,
    );
    if (!free) throw new ConflictError('La mesa u horario propuesto ya no está disponible');
  }
}
