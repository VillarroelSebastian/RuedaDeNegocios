/**
 * What the staff screen paints on a table. It is read from the bookings the
 * table already holds inside the meeting window of the event.
 */
export const TABLE_STATES = ['LIBRE', 'PRE_RESERVADA', 'RESERVADA', 'EN_USO'] as const;

export type TableState = (typeof TABLE_STATES)[number];

/** Meetings that still stand: a cancelled or finished one frees the table. */
const IN_PROGRESS = 'EN_CURSO';
const BOOKED = ['PROGRAMADA', 'REPROGRAMADA'];

export function computeTableState(
  meetings: { estadoReunion: string }[],
  pendingRequests: number,
): TableState {
  if (meetings.some((meeting) => meeting.estadoReunion === IN_PROGRESS)) return 'EN_USO';
  if (meetings.some((meeting) => BOOKED.includes(meeting.estadoReunion))) return 'RESERVADA';

  // A request that named this table is an intention the staff should see, but
  // it never outranks a meeting that was actually agreed.
  return pendingRequests > 0 ? 'PRE_RESERVADA' : 'LIBRE';
}
