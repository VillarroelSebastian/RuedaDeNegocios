import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAILER_PORT, type MailerPort } from '../../../../shared/application/ports/mailer.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import type {
  ApprovalEmail,
  PaymentNotifierPort,
} from '../../application/ports/payment-notifier.port.js';
import type { EnrollmentContact } from '../../domain/ports/payments.repository.port.js';
import { trackingTokenFor } from '../../domain/services/tracking-token.js';

const GREEN = '#449D3A';
const AMBER = '#d97706';
const RED = '#dc2626';

@Injectable()
export class EmailPaymentNotifierAdapter implements PaymentNotifierPort {
  private readonly logger = new Logger(EmailPaymentNotifierAdapter.name);

  constructor(
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async sendApproval(email: ApprovalEmail): Promise<boolean> {
    const { member } = email;
    const eventName = email.eventName ?? 'Rueda de Negocios';

    try {
      await this.mailer.send({
        to: member.correo,
        subject: `¡Tu acceso ha sido aprobado! — ${eventName}`,
        text: `Hola ${member.nombres}, tu registro en ${email.companyName} fue aprobado. Código de empresa: ${email.companyCode}. Correo: ${member.correo}.${email.temporaryPassword ? ` Contraseña temporal: ${email.temporaryPassword}.` : ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
            <h2 style="color:${GREEN};margin-bottom:4px">¡Bienvenido/a a la Rueda de Negocios!</h2>
            <p style="color:#374151;margin-bottom:20px">
              Hola <strong>${esc(member.nombres)} ${esc(member.apellidoPaterno)}</strong>, tu registro como parte de
              <strong>${esc(email.companyName)}</strong> ha sido <strong style="color:${GREEN}">aprobado</strong>.
            </p>
            ${member.esResponsable ? responsibleBanner() : ''}
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px">
              <p style="color:#6b7280;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Tus credenciales de acceso</p>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:110px">Código empresa</td><td style="padding:6px 0;font-weight:700;color:#111827">${esc(email.companyCode)}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Correo</td><td style="padding:6px 0;font-weight:700;color:#111827;overflow-wrap:anywhere">${esc(member.correo)}</td></tr>
                ${
                  email.temporaryPassword
                    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Contraseña</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:18px;letter-spacing:2px">${esc(email.temporaryPassword)}</td></tr>`
                    : '<tr><td colspan="2" style="padding:6px 0;color:#166534;font-size:13px;font-weight:700">Usa la misma contraseña de tu cuenta existente.</td></tr>'
                }
              </table>
            </div>
            ${
              email.qrUrl
                ? `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px;text-align:center">
                     <p style="color:#6b7280;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Tu credencial digital</p>
                     <img src="${esc(email.qrUrl)}" alt="Código QR de acceso" width="180" height="180" style="border-radius:8px" />
                     <p style="color:#9ca3af;font-size:11px;margin:10px 0 0">Preséntala en el evento. También la encontrarás en tu perfil.</p>
                   </div>`
                : ''
            }
            <p style="color:#9ca3af;font-size:12px;margin:0">${
              member.reusedAccount
                ? 'Tu cuenta ahora también tiene acceso a este evento.'
                : 'Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.'
            }</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      this.logger.warn(`Could not send the approval email to ${member.correo}: ${String(error)}`);
      return false;
    }
  }

  async sendObservation(contact: EnrollmentContact, observacion: string): Promise<void> {
    const trackingUrl = `${this.env.WEB_URL.replace(/\/$/, '')}/seguimiento?ee=${contact.companyEventId}&t=${trackingTokenFor(contact.companyEventId, this.env.JWT_SECRET)}`;
    const eventName = contact.eventName ?? 'Rueda de Negocios';

    await this.trySend(contact.correo, {
      subject: `Comprobante con observaciones — ${eventName}`,
      text: `Hola ${contact.nombres}, el comprobante de ${contact.companyName} presenta observaciones: ${observacion}. Sube uno corregido en ${trackingUrl}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
          <h2 style="color:${AMBER};margin-bottom:4px">Comprobante con observaciones</h2>
          <p style="color:#374151;margin-bottom:20px">
            Hola <strong>${esc(contact.nombres)} ${esc(contact.apellidoPaterno)}</strong>, el comprobante de pago de
            <strong>${esc(contact.companyName)}</strong> para el evento <strong>${esc(eventName)}</strong> ha sido revisado y presenta observaciones.
          </p>
          <div style="background:#fff;border:2px solid #fbbf24;border-radius:10px;padding:20px;margin-bottom:20px">
            <p style="color:#92400e;font-size:13px;margin:0 0 8px;font-weight:700;text-transform:uppercase">Observación del equipo:</p>
            <p style="color:#374151;font-size:14px;margin:0">${esc(observacion)}</p>
          </div>
          <a href="${esc(trackingUrl)}" style="display:inline-block;background:${AMBER};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;font-size:14px">
            Ver seguimiento y subir nuevo comprobante →
          </a>
        </div>
      `,
    });
  }

  async sendRejection(contact: EnrollmentContact, motivo: string): Promise<void> {
    const eventName = contact.eventName ?? 'Rueda de Negocios';

    await this.trySend(contact.correo, {
      subject: `Comprobante de pago rechazado — ${eventName}`,
      text: `Hola ${contact.nombres}, el comprobante de ${contact.companyName} fue rechazado. Motivo: ${motivo}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
          <h2 style="color:${RED};margin-bottom:4px">Comprobante rechazado</h2>
          <p style="color:#374151;margin-bottom:20px">
            Hola <strong>${esc(contact.nombres)} ${esc(contact.apellidoPaterno)}</strong>, lamentamos informarte que el comprobante de pago de
            <strong>${esc(contact.companyName)}</strong> para el evento <strong>${esc(eventName)}</strong> ha sido rechazado.
          </p>
          <div style="background:#fff;border:2px solid #fca5a5;border-radius:10px;padding:20px">
            <p style="color:#991b1b;font-size:13px;margin:0 0 8px;font-weight:700;text-transform:uppercase">Motivo del rechazo:</p>
            <p style="color:#374151;font-size:14px;margin:0">${esc(motivo)}</p>
          </div>
        </div>
      `,
    });
  }

  /** Review already happened; a failed email must not undo it. */
  private async trySend(
    to: string,
    message: { subject: string; text: string; html: string },
  ): Promise<void> {
    try {
      await this.mailer.send({ to, ...message });
    } catch (error) {
      this.logger.warn(`Could not send "${message.subject}" to ${to}: ${String(error)}`);
    }
  }
}

function responsibleBanner(): string {
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:20px">
    <p style="margin:0;font-weight:700;color:#166534;font-size:14px">⭐ Eres el Encargado de la empresa</p>
    <p style="margin:4px 0 0;color:#15803d;font-size:12px">Podrás gestionar reuniones, ver mesas asignadas y el directorio de empresas.</p>
  </div>`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
