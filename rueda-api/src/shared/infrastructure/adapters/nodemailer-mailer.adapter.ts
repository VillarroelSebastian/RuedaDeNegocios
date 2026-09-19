import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { MailMessage, MailerPort } from '../../application/ports/mailer.port.js';
import type { Env } from '../../config/env.schema.js';

@Injectable()
export class NodemailerMailerAdapter implements MailerPort {
  private readonly logger = new Logger(NodemailerMailerAdapter.name);
  private transporter?: Transporter;

  constructor(private readonly env: Env) {}

  async send(message: MailMessage): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`Mail skipped, MAIL_USER/MAIL_PASS are not configured: "${message.subject}"`);
      return;
    }

    await transporter.sendMail({
      from: this.env.MAIL_FROM ?? this.env.MAIL_USER,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: message.attachments,
    });
  }

  private getTransporter(): Transporter | undefined {
    if (!this.env.MAIL_USER || !this.env.MAIL_PASS) return undefined;
    this.transporter ??= nodemailer.createTransport({
      service: 'gmail',
      auth: { user: this.env.MAIL_USER, pass: this.env.MAIL_PASS },
    });
    return this.transporter;
  }
}
