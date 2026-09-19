import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';

/** Everything that bounds how many people one enrollment may register. */
export interface CapacitySource {
  /** Slots the company actually paid for (`empresaevento.numeroParticipantes`). */
  paidSlots: number;
  usedSlots: number;
  packageName: string | null;
  packageMaxParticipants: number | null;
  packageIncludedCredentials: number | null;
  eventMaxPerCompany: number | null;
}

/** Applied when neither a package nor the event declares a limit. */
const FALLBACK_MAX = 5;

/**
 * The package rules. Enrollments made before packages existed fall back to the
 * event-wide limit so old registrations keep working.
 */
export function maxParticipantsOf(source: CapacitySource): number {
  if (source.packageName !== null) {
    return Math.max(source.packageMaxParticipants ?? 0, source.packageIncludedCredentials ?? 0);
  }
  return source.eventMaxPerCompany ?? FALLBACK_MAX;
}

export function availableSlots(source: CapacitySource): number {
  return Math.max(0, source.paidSlots - source.usedSlots);
}

/**
 * Two independent ceilings guard a new participant: the slots paid for, and the
 * maximum the package or the event allows. Paid slots are checked first,
 * because that is the one the company can fix by buying more.
 */
export function assertSlotAvailable(source: CapacitySource): void {
  if (source.usedSlots >= source.paidSlots) {
    throw new ConflictError('No hay cupos pagados disponibles. Solicita cupos adicionales.');
  }

  const ceiling = maxParticipantsOf(source);
  if (source.usedSlots >= ceiling) {
    throw new ConflictError(
      source.packageName
        ? `Tu ${source.packageName} permite hasta ${ceiling} participantes y ya los tienes registrados. Cambia de paquete para sumar más personas.`
        : `No puedes agregar más participantes porque superarías el máximo permitido (${ceiling}) por las reglas del evento.`,
    );
  }
}
