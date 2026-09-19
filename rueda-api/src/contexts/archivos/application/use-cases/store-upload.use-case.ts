import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  FILE_STORAGE_PORT,
  type FileStoragePort,
} from '../../../../shared/application/ports/file-storage.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { assertAllowedUpload } from '../../domain/services/upload-validation.js';

export interface IncomingFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Takes a file from a device and stores it, handing back the URL everything
 * else refers to it by: a payment receipt, a company logo, a gallery picture.
 *
 * It is deliberately open to callers without an account, because a company
 * uploads its receipt while registering, before it has one.
 */
@Injectable()
export class StoreUploadUseCase {
  constructor(
    @Inject(FILE_STORAGE_PORT) private readonly storage: FileStoragePort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async execute(file: IncomingFile | undefined): Promise<{ url: string }> {
    if (!file?.buffer) throw new ValidationError('No se proporcionó ningún archivo');

    const { mime, extension } = assertAllowedUpload(file.mimetype, file.buffer, file.size);

    const stored = await this.storage.save({
      folder: '.',
      // The name carries no part of what was uploaded: a name chosen by the
      // caller is a name chosen by an attacker.
      filename: `${Date.now()}-${randomBytes(8).toString('hex')}${extension}`,
      content: file.buffer,
      mimeType: mime,
    });

    const base = (this.env.PUBLIC_URL ?? `http://localhost:${this.env.PORT}`).replace(/\/$/, '');

    return { url: `${base}${stored.url}` };
  }
}
