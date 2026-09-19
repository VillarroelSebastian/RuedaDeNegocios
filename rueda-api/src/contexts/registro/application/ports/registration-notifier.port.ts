/** Confirmation the person in charge receives right after registering. */
export interface SubmissionReceiptEmail {
  companyEventId: number;
  correo: string;
  nombres: string;
  apellidoPaterno: string;
  companyName: string;
  eventName: string | null;
  numeroParticipantes: number;
  montoPagado: number;
}

export interface RegistrationNotifierPort {
  /**
   * Never rejects: the registration is already stored, and a mail server that
   * is down must not undo it.
   */
  sendSubmissionReceipt(email: SubmissionReceiptEmail): Promise<void>;
}

export const REGISTRATION_NOTIFIER = Symbol('RegistrationNotifierPort');
