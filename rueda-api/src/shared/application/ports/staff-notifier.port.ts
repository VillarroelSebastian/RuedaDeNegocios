/** Something the event team has to deal with, not a company. */
export interface StaffNotification {
  eventId: number;
  /** Dotted event name, e.g. `staff:reunion-sin-enlace`. */
  tipo: string;
  titulo: string;
  mensaje: string;
  referenciaId: number;
  referenciaTabla?: string;
  urgente?: boolean;
  /**
   * Skips the notice when an equal one was raised inside this many minutes.
   * The same problem noticed twice is still one problem.
   */
  evitarDuplicadoMinutos?: number;
}

/**
 * Notifies the event team: persists the entry for its board, and pushes it live.
 * Never fails the operation that triggered it.
 */
export interface StaffNotifierPort {
  notify(notification: StaffNotification): Promise<void>;
}

export const STAFF_NOTIFIER_PORT = Symbol('StaffNotifierPort');
