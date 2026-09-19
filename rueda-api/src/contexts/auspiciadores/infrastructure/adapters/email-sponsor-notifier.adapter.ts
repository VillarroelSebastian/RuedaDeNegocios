import { Inject, Injectable } from '@nestjs/common';
import { MAILER_PORT, type MailerPort } from '../../../../shared/application/ports/mailer.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import type {
  PlatformAccessEmail,
  SponsorCredentialEmail,
  SponsorNotifierPort,
} from '../../application/ports/sponsor-credential.port.js';

const GREEN = '#449D3A';

@Injectable()
export class EmailSponsorNotifierAdapter implements SponsorNotifierPort {
  constructor(
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Reports failure rather than swallowing it: the caller collects the
   * addresses that bounced so the staff can hand those badges over in person.
   */
  async sendCredential(email: SponsorCredentialEmail): Promise<void> {
    await this.mailer.send({
      to: email.correo,
      subject: `Tu credencial para ${email.eventoNombre}`,
      text: `Hola ${email.nombreCompleto}, fuiste registrado como representante de ${email.nombreEmpresa}. Tu credencial: ${email.urlCredencialQR}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#1f2937">
          <h2 style="color:${GREEN}">Hola, ${esc(email.nombreCompleto)}</h2>
          <p>Fuiste registrado como representante de <strong>${esc(email.nombreEmpresa)}</strong>
          para <strong>${esc(email.eventoNombre)}</strong>.</p>
          <p>Presenta esta credencial QR para ingresar al evento:</p>
          <p style="text-align:center">
            <img src="${esc(email.urlCredencialQR)}" alt="Credencial QR" width="280" style="max-width:100%;height:auto" />
          </p>
          <p style="text-align:center">
            <a href="${esc(email.urlCredencialQR)}" style="color:${GREEN};font-weight:bold">Abrir o descargar credencial</a>
          </p>
          <p style="font-size:12px;color:#6b7280">Esta credencial es personal y corresponde únicamente a este evento.</p>
        </div>
      `,
    });
  }

  async sendPlatformAccess(email: PlatformAccessEmail): Promise<void> {
    const loginUrl = `${this.env.WEB_URL.replace(/\/$/, '')}/auth/login`;

    await this.mailer.send({
      to: email.correo,
      subject: `Acceso a la plataforma — ${email.nombreEmpresa}`,
      text: `Ya puedes ingresar como empresa. Correo: ${email.correo}. Contraseña temporal: ${email.contraseniaTemporal}. Ingresa en ${loginUrl}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
          <h2 style="color:${GREEN}">Acceso de empresa auspiciadora</h2>
          <p>Ya puedes ingresar como empresa y acceder a las funcionalidades del evento.</p>
          <div style="padding:18px;background:#f0fdf4;border-radius:12px">
            <strong>Correo:</strong> ${esc(email.correo)}<br/>
            <strong>Contraseña temporal:</strong> ${esc(email.contraseniaTemporal)}
          </div>
          <p style="margin-top:20px">
            <a href="${esc(loginUrl)}" style="color:${GREEN};font-weight:bold">Ingresar a la plataforma</a>
          </p>
          <p style="color:#9ca3af;font-size:12px">Por seguridad, cambia tu contraseña después del primer inicio de sesión.</p>
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
