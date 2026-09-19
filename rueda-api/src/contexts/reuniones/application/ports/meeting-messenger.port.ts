/** Writes to the person answering for a company about one of its meetings. */
export interface MeetingMessengerPort {
  send(contact: { nombres: string; correo: string }, mensaje: string): Promise<void>;
}

export const MEETING_MESSENGER_PORT = Symbol('MeetingMessengerPort');
