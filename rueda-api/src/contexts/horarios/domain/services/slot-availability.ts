import {
  type TimeWindow,
  boliviaDateKey,
  boliviaHourMinute,
} from '../../../../shared/domain/bolivia-time.js';
import type {
  DailyMeetingHours,
  HourRange,
} from '../../../eventos/domain/services/meeting-hours.js';
import type { Slot } from './slot-grid.js';

/**
 * Why a slot can or cannot be taken. The order matters: a slot that has gone is
 * reported as past whatever else is true about it, because offering a reason it
 * is "busy" only invites people to ask why they cannot book it anyway.
 */
export type SlotState = 'DISPONIBLE' | 'PASADO' | 'PENDIENTE' | 'OCUPADO' | 'NO_DISPONIBLE';

export interface AvailabilityConstraints {
  now: Date;
  /** Minutes the room needs between two meetings. */
  cleanupMinutes: number;
  /** Meetings of either company that still stand. */
  meetings: TimeWindow[];
  /** Requests of either company that are still waiting for an answer. */
  pendingRequests: TimeWindow[];
  /** Slots either company blocked by hand. */
  blocks: TimeWindow[];
  /** Hours the receiving company declared; empty means any hour will do. */
  receiverRanges: HourRange[];
  /** Per-day availability of each company involved. */
  dailyAvailability: DailyMeetingHours[][];
  /** The event team books on behalf of both, so it sees past what they declared. */
  ignoreCompanyAvailability: boolean;
}

export interface AgendaEntry {
  inicio: string;
  fin: string;
  disponible: boolean;
  estado: SlotState;
}

const MS_PER_MINUTE = 60_000;

function overlaps(window: TimeWindow, slot: Slot, marginMs = 0): boolean {
  return (
    window.start.getTime() - marginMs < slot.fin.getTime() &&
    window.end.getTime() + marginMs > slot.inicio.getTime()
  );
}

/** `HH:MM` of the event's own zone, which is how people declare their hours. */
function hhmm(instant: Date): string {
  return boliviaHourMinute(instant).hhmm;
}

function fitsInSomeRange(ranges: HourRange[], slot: Slot): boolean {
  // Nothing declared is not a restriction: any hour will do.
  if (ranges.length === 0) return true;

  const from = hhmm(slot.inicio);
  const to = hhmm(slot.fin);

  // The whole meeting has to fit, not merely start inside the range.
  return ranges.some((range) => from >= range.desde && to <= range.hasta && from < to);
}

function fitsDeclaredDay(days: DailyMeetingHours[], slot: Slot): boolean {
  const day = days.find((entry) => entry.fecha === boliviaDateKey(slot.inicio));
  // A day nobody configured is a day nobody ruled out.
  if (!day) return true;
  if (!day.habilitado) return false;

  return fitsInSomeRange(day.rangos, slot);
}

export function slotState(slot: Slot, constraints: AvailabilityConstraints): SlotState {
  const cleanupMs = Math.max(0, constraints.cleanupMinutes) * MS_PER_MINUTE;

  const past = slot.inicio.getTime() <= constraints.now.getTime();
  const pending = constraints.pendingRequests.some((request) =>
    overlaps(request, slot, cleanupMs),
  );
  const booked = constraints.meetings.some((meeting) => overlaps(meeting, slot, cleanupMs));

  // A block is a stretch the company crossed out, not a meeting, so no cleanup
  // time is added around it.
  const unavailable =
    !constraints.ignoreCompanyAvailability &&
    (constraints.blocks.some((block) => overlaps(block, slot)) ||
      !fitsInSomeRange(constraints.receiverRanges, slot) ||
      constraints.dailyAvailability.some((days) => !fitsDeclaredDay(days, slot)));

  if (!past && !pending && !booked && !unavailable) return 'DISPONIBLE';
  if (past) return 'PASADO';
  if (pending) return 'PENDIENTE';
  if (booked) return 'OCUPADO';
  return 'NO_DISPONIBLE';
}

/**
 * Reads the availability a company saved on its enrollment. It is stored as
 * free-form JSON, so anything unreadable is treated as "nothing declared"
 * rather than as a reason to refuse every slot.
 */
export function parseStoredAvailability(stored: string | null): DailyMeetingHours[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((day) => {
    const fecha = typeof (day as DailyMeetingHours)?.fecha === 'string'
      ? (day as DailyMeetingHours).fecha
      : '';
    if (!fecha) return [];

    const rangos = Array.isArray((day as DailyMeetingHours)?.rangos)
      ? (day as DailyMeetingHours).rangos.map((range) => ({
          desde: String(range?.desde ?? ''),
          hasta: String(range?.hasta ?? ''),
        }))
      : [];

    return [{ fecha, habilitado: (day as DailyMeetingHours)?.habilitado !== false, rangos }];
  });
}

/** Every slot with its reason, which is what the agenda screen paints. */
export function buildAgenda(slots: Slot[], constraints: AvailabilityConstraints): AgendaEntry[] {
  return slots.map((slot) => {
    const estado = slotState(slot, constraints);
    return {
      inicio: slot.inicio.toISOString(),
      fin: slot.fin.toISOString(),
      disponible: estado === 'DISPONIBLE',
      estado,
    };
  });
}
