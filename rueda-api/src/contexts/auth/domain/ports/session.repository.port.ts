import type { Role } from '../../../../shared/domain/role.js';

/** Live state of an account, re-read on every authenticated request. */
export interface SessionSnapshot {
  id: number;
  role: Role;
  assignedEventId: number | null;
  /** Memberships whose enrollment is currently enabled and paid. */
  grantedMemberships: { id: number; companyEventId: number }[];
}

export interface SessionRepositoryPort {
  findActiveSession(userId: number): Promise<SessionSnapshot | null>;
  findPrincipalEventId(): Promise<number | null>;
}

export const SESSION_REPOSITORY = Symbol('SessionRepositoryPort');
