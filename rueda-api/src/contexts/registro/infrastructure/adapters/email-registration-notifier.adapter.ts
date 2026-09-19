import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAILER_PORT, type MailerPort } from '../../../../shared/application/ports/mailer.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import { trackingTokenFor } from '../../../pagos/domain/services/tracking-token.js';
import type {
  RegistrationNotifierPort,
  SubmissionReceiptEmail,
} from '../../application/ports/registration-notifier.port.js';

const GREEN = '#449D3A';
const AMBER = '#d97706';

@Injectable()
export class EmailRegistrationNotifierAdapter implements RegistrationNotifierPort {
  private readonly logger = new Logger(EmailRegistrationNotifierAdapter.name);

  constructor(
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async sendSubmissionReceipt(email: SubmissionReceiptEmail): Promise<void> {
    const eventName = email.eventName ?? 'Rueda de Negocios';
    const trackingUrl = `${this.env.WEB_URL.replace(/\/$/, '')}/seguimiento?ee=${email.companyEventId}&t=${trackingTokenFor(email.companyEventId, this.env.JWT_SECRET)}`;

    try {
      await this.mailer.send({
        to: email.correo,
        subject: `Solicitud de inscripción recibida — ${eventName}`,
        text: `Hola ${email.nombres}, la inscripción de ${email.companyName} fue recibida y está pendiente de verificación. Sigue su estado en ${trackingUrl}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
            <h2 style="color:${GREEN};margin-bottom:4px">¡Solicitud recibida con éxito!</h2>
            <p style="color:#374151;margin-bottom:20px">
              Hola <strong>${esc(email.nombres)} ${esc(email.apellidoPaterno)}</strong>, tu registro como encargado de
              <strong>${esc(email.companyName)}</strong> en la <strong>${esc(eventName)}</strong> fue recibido correctamente.
            </p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px">
              <p style="color:#6b7280;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Resumen de inscripción</p>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:150px">Empresa</td><td style="padding:5px 0;font-weight:700;color:#111827">${esc(email.companyName)}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:13px">Estado del pago</td><td style="padding:5px 0;font-weight:700;color:${AMBER}">Pendiente de verificación</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:13px">Participantes</td><td style="padding:5px 0;font-weight:700;color:#111827">${email.numeroParticipantes}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:13px">Monto declarado</td><td style="padding:5px 0;font-weight:700;color:#111827">${email.montoPagado} Bs.</td></tr>
              </table>
            </div>
            <p style="color:#374151;font-size:14px;margin-bottom:20px">
              Nuestro equipo verificará tu comprobante de pago. Te notificaremos por correo cuando tu cuenta esté habilitada.
            </p>
            <a href="${esc(trackingUrl)}" style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;font-size:14px">
              Ver estado de mi inscripción →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">Si no realizaste este registro, ignora este correo.</p>
          </div>
        `,
      });
    } catch (error) {
      // The registration is already stored; a mail server that is down must not
      // undo it. The company can still reach its tracking link from the receipt.
      this.logger.warn(
        `Could not send the registration receipt to ${email.correo}: ${String(error)}`,
      );
    }
  }
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
