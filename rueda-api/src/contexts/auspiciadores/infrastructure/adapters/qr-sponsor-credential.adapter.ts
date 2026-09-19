import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import {
  FILE_STORAGE_PORT,
  type FileStoragePort,
} from '../../../../shared/application/ports/file-storage.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import type { SponsorCredentialIssuerPort } from '../../application/ports/sponsor-credential.port.js';
import {
  SPONSORS_REPOSITORY,
  type SponsorsRepositoryPort,
} from '../../domain/ports/sponsors.repository.port.js';
import { sponsorCredentialTokenFor } from '../../domain/services/sponsor-credential-token.js';

/**
 * Renders the badge of one person of a sponsor: a PNG whose QR encodes the
 * public credential URL. Scanning it opens the page that proves who they are.
 */
@Injectable()
export class QrSponsorCredentialAdapter implements SponsorCredentialIssuerPort {
  constructor(
    @Inject(SPONSORS_REPOSITORY) private readonly sponsors: SponsorsRepositoryPort,
    @Inject(FILE_STORAGE_PORT) private readonly storage: FileStoragePort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async issueFor(personId: number): Promise<string> {
    const webUrl = this.env.WEB_URL.replace(/\/$/, '');
    const token = sponsorCredentialTokenFor(personId, this.env.JWT_SECRET);
    const payload = `${webUrl}/credencial/auspiciador/${personId}?t=${token}`;

    const content = await QRCode.toBuffer(payload, {
      width: 800,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    });

    const stored = await this.storage.save({
      folder: '.',
      filename: `credencial-ausp-${personId}-${randomBytes(4).toString('hex')}.png`,
      content,
      mimeType: 'image/png',
    });

    const publicBase = (this.env.PUBLIC_URL ?? `http://localhost:${this.env.PORT}`).replace(
      /\/$/,
      '',
    );
    const url = `${publicBase}${stored.url}`;

    await this.sponsors.setCredentialUrl(personId, url);
    return url;
  }
}
