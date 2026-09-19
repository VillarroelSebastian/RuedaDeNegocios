import type {
  EnrollmentContact,
  MemberToCredential,
} from '../../domain/ports/payments.repository.port.js';

export interface ApprovalEmail {
  member: MemberToCredential;
  companyName: string;
  eventName: string | null;
  companyCode: string;
  /** `null` when the person keeps the password of an account they already had. */
  temporaryPassword: string | null;
  qrUrl: string | null;
}

/** Emails sent as a registration payment moves through review. */
export interface PaymentNotifierPort {
  /** @returns whether the message was delivered. */
  sendApproval(email: ApprovalEmail): Promise<boolean>;
  sendObservation(contact: EnrollmentContact, observacion: string): Promise<void>;
  sendRejection(contact: EnrollmentContact, motivo: string): Promise<void>;
}

export const PAYMENT_NOTIFIER_PORT = Symbol('PaymentNotifierPort');
