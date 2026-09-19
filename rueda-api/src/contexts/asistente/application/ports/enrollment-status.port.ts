import type { AssistantEnrollmentStatus } from '../../domain/models/assistant-view.js';

/**
 * How the company's registration stands. Implemented by the payments context,
 * which owns the payment state and already resolves how many seats a package
 * grants.
 */
export interface EnrollmentStatusPort {
  findStatus(companyEventId: number): Promise<AssistantEnrollmentStatus | null>;
}

export const ENROLLMENT_STATUS_PORT = Symbol('EnrollmentStatusPort');
