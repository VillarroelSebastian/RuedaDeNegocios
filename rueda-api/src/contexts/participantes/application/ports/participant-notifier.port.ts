/** Sends a new participant the details they need to sign in. */
export interface ParticipantNotifierPort {
  /**
   * @param temporaryPassword `null` when the person already had an account and
   *   keeps their existing password.
   * @returns whether the message actually went out.
   */
  sendAccessCredentials(email: string, temporaryPassword: string | null): Promise<boolean>;
}

export const PARTICIPANT_NOTIFIER = Symbol('ParticipantNotifierPort');
