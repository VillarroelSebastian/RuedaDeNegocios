import { Inject, Injectable } from '@nestjs/common';
import {
  MAILER_PORT,
  type MailerPort,
} from '../../../../shared/application/ports/mailer.port.js';
import type { PasswordResetNotifierPort } from '../../application/ports/password-reset-notifier.port.js';

const BRAND_GREEN = '#449D3A';

@Injectable()
export class EmailPasswordResetNotifierAdapter implements PasswordResetNotifierPort {
  constructor(@Inject(MAILER_PORT) private readonly mailer: MailerPort) {}

  async sendResetCode(recipient: { email: string; nombres: string }, code: string): Promise<void> {
    await this.mailer.send({
      to: recipient.email,
      subject: 'Código para restablecer tu contraseña — Rueda de Negocios',
      text: `Hola ${recipient.nombres}. Tu código de verificación es ${code}. Vence en 15 minutos.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
          <h2 style="color:${BRAND_GREEN};margin-bottom:8px">Restablece tu contraseña</h2>
          <p style="color:#374151;margin-bottom:24px">Hola <strong>${escapeHtml(recipient.nombres)}</strong>, recibimos una solicitud para cambiar tu contraseña.</p>
          <div style="background:#fff;border:2px solid ${BRAND_GREEN};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="color:#6b7280;font-size:13px;margin:0 0 8px">Tu código de verificación es:</p>
            <span style="font-size:36px;font-weight:700;color:${BRAND_GREEN};letter-spacing:8px">${escapeHtml(code)}</span>
            <p style="color:#9ca3af;font-size:12px;margin:12px 0 0">Válido por <strong>15 minutos</strong></p>
          </div>
          <p style="color:#9ca3af;font-size:12px">Si no solicitaste esto, ignora este correo.</p>
        </div>
      `,
    });
  }
}

/** The name comes from user input, so it is escaped before entering the markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
