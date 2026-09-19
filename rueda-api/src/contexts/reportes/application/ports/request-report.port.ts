/**
 * Requests still waiting for an answer, told apart by direction. Implemented
 * by the requests context, which owns what an operational request is.
 */
export interface RequestReportPort {
  countPendingReceived(eventId: number, companyEventId: number): Promise<number>;
  countPendingSent(eventId: number, companyEventId: number): Promise<number>;
}

export const REQUEST_REPORT_PORT = Symbol('RequestReportPort');
