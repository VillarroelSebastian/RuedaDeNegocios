/** An entry of a company's bell. */
export interface CompanyNotificationView {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  referenciaId: number;
  referenciaTipo: string;
  leida: boolean;
  fecha: Date;
}

export interface CompanyInbox {
  noLeidas: number;
  notificaciones: CompanyNotificationView[];
}

/** An entry of the event team's board. */
export interface StaffNotificationView {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  referenciaId: number;
  referenciaTipo: string;
  urgente: boolean;
  fecha: Date;
}

/**
 * Something waiting for an administrator. Unlike the other two this is not a
 * stored notification: it is read from the work itself, so it can never fall
 * out of step with what is actually pending.
 */
export interface PendingWorkItem {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha: Date;
  enlace: string;
}

export interface PendingWork {
  items: PendingWorkItem[];
  total: number;
}

export interface NotificationsRepositoryPort {
  findPrincipalEventId(): Promise<number | null>;

  listForCompany(companyEventId: number, limit: number): Promise<CompanyNotificationView[]>;
  countUnreadForCompany(companyEventId: number): Promise<number>;
  markAllReadForCompany(companyEventId: number): Promise<void>;

  listForStaff(eventId: number, limit: number): Promise<StaffNotificationView[]>;

  /** Registrations and payments an administrator still has to look at. */
  listPendingWork(eventId: number): Promise<PendingWork>;
}

export const NOTIFICATIONS_REPOSITORY = Symbol('NotificationsRepositoryPort');
