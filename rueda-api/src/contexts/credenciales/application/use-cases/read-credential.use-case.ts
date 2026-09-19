import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  CREDENTIALS_REPOSITORY,
  type CredentialView,
  type CredentialsRepositoryPort,
} from '../../domain/ports/credentials.repository.port.js';
import { isValidCredentialToken } from '../../domain/services/credential-token.js';
import type { CredentialReaderPort } from '../ports/credential-reader.port.js';

/**
 * Opens a badge from its signed link. Public on purpose: whoever scans the QR —
 * staff, another company, the person themselves — sees that the participant
 * and their company are registered.
 */
@Injectable()
export class ReadCredentialUseCase implements CredentialReaderPort {
  constructor(
    @Inject(CREDENTIALS_REPOSITORY) private readonly credentials: CredentialsRepositoryPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async read(companyUserId: number, token: string | undefined): Promise<CredentialView> {
    if (!isValidCredentialToken(companyUserId, token, this.env.JWT_SECRET)) {
      throw new ValidationError('La credencial es inválida o fue alterada.');
    }

    const view = await this.credentials.findCredentialView(companyUserId);
    if (!view) throw new NotFoundError('La credencial no existe.');
    return view;
  }
}
