export interface CompanyNotification {
  companyEventId: number;
  /** Dotted event name, e.g. `pago:aprobado`. Clients subscribe by it. */
  tipo: string;
  titulo: string;
  mensaje: string;
  referenciaId?: number;
  referenciaTabla?: string;
}

/**
 * Notifies a company: persists the entry for its bell, and pushes it live.
 * Never fails the operation that triggered it.
 */
export interface CompanyNotifierPort {
  notify(notification: CompanyNotification): Promise<void>;
  /** Skips the notification when one already exists for the same reference. */
  notifyOnce(notification: CompanyNotification & { referenciaId: number }): Promise<void>;
}

export const COMPANY_NOTIFIER_PORT = Symbol('CompanyNotifierPort');
