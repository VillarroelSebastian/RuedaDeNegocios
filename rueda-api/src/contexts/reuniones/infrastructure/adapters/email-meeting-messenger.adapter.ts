import { Inject, Injectable } from '@nestjs/common';
import { MAILER_PORT, type MailerPort } from '../../../../shared/application/ports/mailer.port.js';
import type { MeetingMessengerPort } from '../../application/ports/meeting-messenger.port.js';

const GREEN = '#449D3A';

@Injectable()
export class EmailMeetingMessengerAdapter implements MeetingMessengerPort {
  constructor(@Inject(MAILER_PORT) private readonly mailer: MailerPort) {}

  /**
   * Unlike the other notifications, a failure here is reported: the staff typed
   * this message by hand and has to know whether it went out.
   */
  async send(contact: { nombres: string; correo: string }, mensaje: string): Promise<void> {
    await this.mailer.send({
      to: contact.correo,
      subject: 'Mensaje del técnico — Rueda de Negocios',
      text: `Hola ${contact.nombres}, el técnico del evento te ha enviado el siguiente mensaje: ${mensaje}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
          <h2 style="color:${GREEN};margin-bottom:8px">Mensaje del Técnico</h2>
          <p style="color:#374151;margin-bottom:16px">Hola <strong>${esc(contact.nombres)}</strong>, el técnico del evento te ha enviado el siguiente mensaje:</p>
          <div style="background:#fff;border-left:4px solid ${GREEN};padding:16px;border-radius:8px;margin-bottom:16px">
            <p style="color:#111827;margin:0;white-space:pre-wrap">${esc(mensaje)}</p>
          </div>
          <p style="color:#9ca3af;font-size:12px">Este es un mensaje automático del sistema de Rueda de Negocios.</p>
        </div>
      `,
    });
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
