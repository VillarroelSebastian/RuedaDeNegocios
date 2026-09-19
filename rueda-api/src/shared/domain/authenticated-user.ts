import { ForbiddenError } from './errors/domain.error.js';
import type { Role } from './role.js';

/**
 * The caller behind a request, rebuilt from the database on every request so a
 * disabled account or a revoked enrollment stops working immediately, without
 * waiting for its token to expire.
 */
export interface AuthenticatedUser {
  id: number;
  role: Role;
  /** Event the caller operates on; for global staff it is the principal event. */
  eventId: number | null;
  /** `empresaevento` ids the caller may act on. */
  companyEventIds: number[];
  /** `empresa_usuario` ids the caller may act on. */
  companyUserIds: number[];
}

/** True when the caller may act on the given `empresaevento`. */
export function ownsCompanyEvent(user: AuthenticatedUser, companyEventId: number): boolean {
  return user.companyEventIds.includes(companyEventId);
}

/** True when the caller may act on the given `empresa_usuario`. */
export function ownsCompanyUser(user: AuthenticatedUser, companyUserId: number): boolean {
  return user.companyUserIds.includes(companyUserId);
}

/**
 * The enrollment a company account acts through. It is read from the token and
 * never from the request, so nobody can act on behalf of another company.
 */
export function enrollmentOf(user: AuthenticatedUser): number {
  const [enrollmentId] = user.companyEventIds;
  if (!enrollmentId) {
    throw new ForbiddenError('Tu inscripción para el evento actual no está habilitada.');
  }
  return enrollmentId;
}

/**
 * The membership a company account acts through: the person inside the company,
 * not the company itself. Read from the token, like the enrollment.
 */
export function membershipOf(user: AuthenticatedUser): number {
  const [membershipId] = user.companyUserIds;
  if (!membershipId) {
    throw new ForbiddenError('Tu inscripción para el evento actual no está habilitada.');
  }
  return membershipId;
}
