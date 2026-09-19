/** Enrollment gates a company account must clear before it can log in. */
export interface EnrollmentStatus {
  accessStatus: string;
  paymentStatus: string;
}

export interface CompanyMembership {
  /** `empresa_usuario.id` */
  id: number;
  /** `empresa_usuario.empresaevento_id` */
  companyEventId: number;
  isResponsible: boolean;
  nombresEvento: string | null;
  apellidoPaternoEvento: string | null;
  apellidoMaternoEvento: string | null;
  telefonoEvento: string | null;
}

export interface CompanyMembershipRepositoryPort {
  findPrincipalEventId(): Promise<number | null>;
  /** Active membership of a user in a given event, regardless of enrollment state. */
  findMembershipInEvent(userId: number, eventId: number | null): Promise<CompanyMembership | null>;
  findEnrollmentStatus(companyEventId: number): Promise<EnrollmentStatus | null>;
  /** Every membership already cleared for access; becomes the token scope. */
  findGrantedMemberships(userId: number): Promise<{ id: number; companyEventId: number }[]>;
}

export const COMPANY_MEMBERSHIP_REPOSITORY = Symbol('CompanyMembershipRepositoryPort');
