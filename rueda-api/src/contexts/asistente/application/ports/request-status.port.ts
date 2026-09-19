/**
 * Meeting requests still waiting for an answer, in either direction.
 * Implemented by the requests context, which owns what pending means.
 */
export interface RequestStatusPort {
  countPending(companyEventId: number): Promise<number>;
}

export const REQUEST_STATUS_PORT = Symbol('RequestStatusPort');
