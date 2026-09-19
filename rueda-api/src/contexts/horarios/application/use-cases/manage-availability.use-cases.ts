import { Inject, Injectable } from '@nestjs/common';
import {
  type DateKey,
  boliviaDateKey,
  boliviaHourMinute,
} from '../../../../shared/domain/bolivia-time.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  dailyMeetingWindows,
  meetingDates,
} from '../../../eventos/domain/services/event-schedule.js';
import {
  type DailyMeetingHours,
  type HourRange,
  normalizeDailyMeetingHours,
} from '../../../eventos/domain/services/meeting-hours.js';
import {
  SCHEDULE_REPOSITORY,
  type EnrollmentSchedule,
  type ScheduleEvent,
  type ScheduleRepositoryPort,
} from '../../domain/ports/schedule.repository.port.js';
import { normalizeHourRanges } from '../../domain/services/hour-ranges.js';
import { fixedSlots } from '../../domain/services/slot-grid.js';

const DEFAULT_FROM = '08:00';
const DEFAULT_TO = '18:00';

export interface SavedRanges {
  rangos: HourRange[];
  huboChoque: boolean;
  mensaje: string;
}

export interface DailyAvailabilityView {
  /** False while the company is still looking at the event defaults. */
  configurado: boolean;
  dias: DailyMeetingHours[];
}

export interface OwnSlot {
  inicio: string;
  fin: string;
  disponible: boolean;
}

/** The ranges of each day the event actually hosts meetings in. */
function rangesByDate(event: ScheduleEvent): Map<DateKey, HourRange[]> {
  const byDate = new Map<DateKey, HourRange[]>();

  for (const window of dailyMeetingWindows(event)) {
    const fecha = boliviaDateKey(window.start);
    const ranges = byDate.get(fecha) ?? [];
    ranges.push({
      desde: boliviaHourMinute(window.start).hhmm,
      hasta: boliviaHourMinute(window.end).hhmm,
    });
    byDate.set(fecha, ranges);
  }

  return byDate;
}

/** Shared by every use case here: the caller's own enrollment and its event. */
@Injectable()
abstract class OwnScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) protected readonly schedule: ScheduleRepositoryPort,
  ) {}

  protected async own(
    companyEventId: number,
  ): Promise<{ enrollment: EnrollmentSchedule; event: ScheduleEvent }> {
    const enrollment = await this.schedule.findEnrollment(companyEventId);
    if (!enrollment) throw new NotFoundError('Inscripción no encontrada');

    const event = await this.schedule.findEvent(enrollment.eventId);
    if (!event) throw new NotFoundError('Inscripción no encontrada');

    return { enrollment, event };
  }
}

@Injectable()
export class ListOwnRangesUseCase extends OwnScheduleUseCase {
  execute(companyEventId: number): Promise<HourRange[]> {
    return this.schedule.listRanges(companyEventId);
  }
}

/**
 * Saves the hours a company is willing to meet in, and turns them into the
 * blocks the agenda reads: every slot of the grid outside every saved range.
 */
@Injectable()
export class ReplaceOwnRangesUseCase extends OwnScheduleUseCase {
  async execute(companyEventId: number, submitted: HourRange[]): Promise<SavedRanges> {
    const { event } = await this.own(companyEventId);
    const { rangos, huboChoque } = normalizeHourRanges(submitted);

    const blocks =
      rangos.length === 0
        ? []
        : fixedSlots(
            dailyMeetingWindows(event),
            event.duracionReunion,
            event.tiempoEntreReuniones,
          )
            .filter((slot) => {
              const start = boliviaHourMinute(slot.inicio).hhmm;
              return !rangos.some((range) => start >= range.desde && start < range.hasta);
            })
            .map((slot) => ({ start: slot.inicio, end: slot.fin }));

    await this.schedule.replaceRanges(companyEventId, rangos, blocks);

    return {
      rangos,
      huboChoque,
      mensaje: huboChoque
        ? 'Se detectó un choque de horarios. Se reemplazó el rango anterior por el nuevo.'
        : 'Horarios guardados correctamente.',
    };
  }
}

@Injectable()
export class GetOwnDailyAvailabilityUseCase extends OwnScheduleUseCase {
  async execute(companyEventId: number): Promise<DailyAvailabilityView> {
    const { enrollment, event } = await this.own(companyEventId);

    const stored = parseDays(enrollment.horariosDisponibilidadJson);
    if (stored.length > 0) return { configurado: true, dias: stored };

    // Nothing saved yet: the company is shown the hours the event itself hosts.
    const byDate = rangesByDate(event);
    return {
      configurado: false,
      dias: meetingDates(event).map((fecha) => ({
        fecha,
        habilitado: true,
        rangos: byDate.get(fecha) ?? [],
      })),
    };
  }
}

@Injectable()
export class SaveOwnDailyAvailabilityUseCase extends OwnScheduleUseCase {
  async execute(companyEventId: number, submitted: unknown): Promise<DailyAvailabilityView> {
    const { event } = await this.own(companyEventId);

    const byDate = rangesByDate(event);
    const [firstWindow] = dailyMeetingWindows(event);

    const dias = normalizeDailyMeetingHours(submitted, {
      dates: meetingDates(event),
      defaultFrom: firstWindow ? boliviaHourMinute(firstWindow.start).hhmm : DEFAULT_FROM,
      defaultTo: firstWindow ? boliviaHourMinute(firstWindow.end).hhmm : DEFAULT_TO,
      allDaysRequired: false,
    });

    // Declaring availability outside the hours the event hosts meetings in
    // would offer slots the agenda can never place.
    const outside = dias.some(
      (day) =>
        day.habilitado &&
        day.rangos.some(
          (range) =>
            !(byDate.get(day.fecha) ?? []).some(
              (window) => range.desde >= window.desde && range.hasta <= window.hasta,
            ),
        ),
    );
    if (outside) {
      throw new ValidationError(
        'Tu disponibilidad debe estar dentro de los horarios de reuniones definidos para cada día.',
      );
    }

    await this.schedule.saveDailyAvailability(companyEventId, JSON.stringify(dias));

    return { configurado: true, dias };
  }
}

/** The grid as the company sees it: every slot, and whether it blocked it. */
@Injectable()
export class ListOwnSlotsUseCase extends OwnScheduleUseCase {
  async execute(companyEventId: number): Promise<OwnSlot[]> {
    const { event } = await this.own(companyEventId);

    const blocks = await this.schedule.listBlocks(companyEventId);

    return fixedSlots(
      dailyMeetingWindows(event),
      event.duracionReunion,
      event.tiempoEntreReuniones,
    ).map((slot) => ({
      inicio: slot.inicio.toISOString(),
      fin: slot.fin.toISOString(),
      disponible: !blocks.some((block) => block.start < slot.fin && block.end > slot.inicio),
    }));
  }
}

@Injectable()
export class ClearOwnBlocksUseCase extends OwnScheduleUseCase {
  async execute(companyEventId: number): Promise<void> {
    await this.schedule.clearBlocks(companyEventId);
  }
}

@Injectable()
export class ToggleOwnSlotUseCase extends OwnScheduleUseCase {
  async execute(
    companyEventId: number,
    inicio: string,
    fin: string,
  ): Promise<{ disponible: boolean }> {
    const start = new Date(inicio);
    const end = new Date(fin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new ValidationError('eeId, inicio y fin requeridos');
    }

    const existing = await this.schedule.findBlockAt(companyEventId, start);
    if (existing) {
      await this.schedule.deactivateBlock(existing.id);
      return { disponible: true };
    }

    await this.schedule.createBlock(companyEventId, { start, end });
    return { disponible: false };
  }
}

function parseDays(stored: string | null): DailyMeetingHours[] {
  try {
    const parsed = JSON.parse(stored || '[]');
    return Array.isArray(parsed) ? (parsed as DailyMeetingHours[]) : [];
  } catch {
    return [];
  }
}
