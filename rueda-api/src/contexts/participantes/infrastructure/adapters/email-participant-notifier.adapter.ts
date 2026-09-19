import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAILER_PORT, type MailerPort } from '../../../../shared/application/ports/mailer.port.js';
import type { ParticipantNotifierPort } from '../../application/ports/participant-notifier.port.js';

const BRAND_GREEN = '#449D3A';

@Injectable()
export class EmailParticipantNotifierAdapter implements ParticipantNotifierPort {
  private readonly logger = new Logger(EmailParticipantNotifierAdapter.name);

  constructor(@Inject(MAILER_PORT) private readonly mailer: MailerPort) {}

  async sendAccessCredentials(email: string, temporaryPassword: string | null): Promise<boolean> {
    try {
      await this.mailer.send({
        to: email,
        subject: 'Tu acceso a la Rueda de Negocios',
        text: temporaryPassword
          ? `Tu participante fue habilitado. Correo: ${email}. Contraseña temporal: ${temporaryPassword}. Cámbiala al iniciar sesión.`
          : `Tu participante fue habilitado. Correo: ${email}. Usa la misma contraseña de tu cuenta existente.`,
        html: `
          <div style="font-family:Arial;max-width:520px;margin:auto">
            <h2 style="color:${BRAND_GREEN}">Tu participante fue habilitado</h2>
            <p>Correo: <strong>${escapeHtml(email)}</strong></p>
            ${
              temporaryPassword
                ? `<p>Contraseña temporal: <strong>${escapeHtml(temporaryPassword)}</strong></p><p>Cámbiala al iniciar sesión.</p>`
                : '<p>Usa la misma contraseña de tu cuenta existente para ingresar a este evento.</p>'
            }
          </div>
        `,
      });
      return true;
    } catch (error) {
      // Registration already succeeded; a failed email must not undo it.
      this.logger.warn(`Could not send access credentials to ${email}: ${String(error)}`);
      return false;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
