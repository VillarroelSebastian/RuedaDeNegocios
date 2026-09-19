import { Inject, Injectable } from '@nestjs/common';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';
import {
  FILE_STORAGE_PORT,
  type FileStoragePort,
} from '../../../../shared/application/ports/file-storage.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { CredentialIssuerPort } from '../../application/ports/credential-issuer.port.js';
import { credentialTokenFor } from '../../domain/services/credential-token.js';

/**
 * Renders the participant badge: a PNG whose QR encodes the public credential
 * URL. Scanning it opens a page that proves the person and their company are
 * registered and enabled.
 */
@Injectable()
export class QrCredentialIssuerAdapter implements CredentialIssuerPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_PORT) private readonly storage: FileStoragePort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async issueFor(companyUserId: number): Promise<string> {
    const webUrl = this.env.WEB_URL.replace(/\/$/, '');
    const payload = `${webUrl}/credencial/${companyUserId}?t=${credentialTokenFor(companyUserId, this.env.JWT_SECRET)}`;

    const content = await QRCode.toBuffer(payload, {
      width: 800,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    });

    const stored = await this.storage.save({
      folder: '.',
      filename: `credencial-${companyUserId}-${randomBytes(4).toString('hex')}.png`,
      content,
      mimeType: 'image/png',
    });

    const publicBase = (this.env.PUBLIC_URL ?? `http://localhost:${this.env.PORT}`).replace(/\/$/, '');
    const url = `${publicBase}${stored.url}`;

    await this.prisma.empresa_usuario.update({
      where: { id: companyUserId },
      data: { urlCredencialQR: url },
    });
    return url;
  }
}
