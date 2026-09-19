/** Pushes live events to connected clients over the notifications socket. */
export interface RealtimePublisherPort {
  toCompanyEvent(companyEventId: number, event: string, payload: object): void;
  toStaff(event: string, payload: object): void;
  broadcast(event: string, payload: object): void;
}

export const REALTIME_PUBLISHER_PORT = Symbol('RealtimePublisherPort');
