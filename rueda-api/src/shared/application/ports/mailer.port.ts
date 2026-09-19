export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  cid?: string;
  contentType?: string;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
}

/** Sends transactional email. Implemented with nodemailer over Gmail. */
export interface MailerPort {
  send(message: MailMessage): Promise<void>;
}

export const MAILER_PORT = Symbol('MailerPort');
