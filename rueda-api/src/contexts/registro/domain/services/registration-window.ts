import { EVENT_TIME_ZONE } from '../../../../shared/domain/bolivia-time.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/**
 * The period a company may submit its registration in. Both ends are optional:
 * an event that declares neither takes registrations for as long as it lives.
 */
export interface RegistrationWindow {
  opensAt: Date | null;
  closesAt: Date | null;
}

/** Wall-clock date and time of the event's own zone, as people read it. */
function inEventZone(instant: Date): string {
  return instant.toLocaleString('es-BO', { timeZone: EVENT_TIME_ZONE });
}

export function assertRegistrationOpen(window: RegistrationWindow, now: Date): void {
  // Both comparisons are strict: the boundary instant itself belongs to the
  // open period, so a submission at the opening second is accepted.
  if (window.opensAt && now < window.opensAt) {
    throw new ValidationError(`Las inscripciones abren el ${inEventZone(window.opensAt)}`);
  }
  if (window.closesAt && now > window.closesAt) {
    throw new ValidationError(`El período de inscripción cerró el ${inEventZone(window.closesAt)}`);
  }
}
