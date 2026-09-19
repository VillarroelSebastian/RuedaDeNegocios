import { Inject, Injectable } from '@nestjs/common';
import { MAILER_PORT, type MailerPort } from '../../../../shared/application/ports/mailer.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import type {
  ProfileResetEmail,
  StaffCredentialsNotifierPort,
  TechnicianCredentialsEmail,
} from '../../application/ports/staff-notifier.port.js';

const GREEN = '#449D3A';

/**
 * Failures here are reported rather than swallowed: a staff account whose
 * password never arrived has no way in, and the caller decides what to do about
 * it — put the old password back, or record that the delivery failed.
 */
@Injectable()
export class EmailStaffCredentialsAdapter implements StaffCredentialsNotifierPort {
  constructor(
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async sendTechnicianCredentials(email: TechnicianCredentialsEmail): Promise<void> {
    const event = [email.eventoNombre, email.eventoEdicion].filter(Boolean).join(' ');
    const subject = event
      ? `Tus credenciales de acceso — ${event}`
      : 'Tus credenciales de acceso — Rueda de Negocios';

    await this.mailer.send({
      to: email.correo,
      subject,
      text: `Hola ${email.nombres}, tu cuenta del equipo del evento ya está activa. Correo: ${email.correo}. Contraseña temporal: ${email.contraseniaTemporal}. Ingresa en ${this.loginUrl()}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
          <h2 style="color:${GREEN};margin-bottom:4px">Tu acceso al equipo del evento</h2>
          <p style="color:#374151;margin-bottom:20px">
            Hola <strong>${esc(email.nombres)} ${esc(email.apellidoPaterno)}</strong>, tu cuenta ya está activa${
              event ? ` para <strong>${esc(event)}</strong>` : ''
            }.
          </p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:110px">Correo</td><td style="padding:6px 0;font-weight:700;color:#111827;overflow-wrap:anywhere">${esc(email.correo)}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Contraseña</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:18px;letter-spacing:2px">${esc(email.contraseniaTemporal)}</td></tr>
            </table>
          </div>
          <a href="${esc(this.loginUrl())}" style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;font-size:14px">
            Ingresar a la plataforma →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Por seguridad, cambia tu contraseña después del primer inicio de sesión.</p>
        </div>
      `,
    });
  }

  async sendProfileReset(email: ProfileResetEmail): Promise<void> {
    await this.mailer.send({
      to: email.correo,
      subject: 'Tu correo fue actualizado — Rueda de Negocios',
      text: `Por seguridad reiniciamos tu contraseña. Correo: ${email.correo}. Contraseña temporal: ${email.contraseniaTemporal}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="color:${GREEN}">Tu correo fue actualizado</h2>
          <p>Por seguridad reiniciamos tu contraseña.</p>
          <div style="padding:18px;background:#f0fdf4;border-radius:12px">
            <strong>Correo:</strong> ${esc(email.correo)}<br/>
            <strong>Contraseña temporal:</strong> ${esc(email.contraseniaTemporal)}
          </div>
          <p style="margin-top:20px">
            <a href="${esc(this.loginUrl())}" style="color:${GREEN};font-weight:bold">Ingresar a la plataforma</a>
          </p>
          <p style="color:#9ca3af;font-size:12px">Cambia esta contraseña después de iniciar sesión.</p>
        </div>
      `,
    });
  }

  private loginUrl(): string {
    return `${this.env.WEB_URL.replace(/\/$/, '')}/auth/login`;
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
