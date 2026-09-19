import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CREDENTIAL_ISSUER_PORT,
  type CredentialIssuerPort,
} from '../ports/credential-issuer.port.js';
import {
  CREDENTIALS_REPOSITORY,
  type CredentialsRepositoryPort,
} from '../../domain/ports/credentials.repository.port.js';

export interface ReissueSummary {
  regeneradas: number;
  fallidas: number;
}

/**
 * Re-renders every badge of the running event. Idempotent, so it is safe to run
 * after a deploy that changes the badge format or the public URL.
 */
@Injectable()
export class ReissueCredentialsUseCase {
  private readonly logger = new Logger(ReissueCredentialsUseCase.name);

  constructor(
    @Inject(CREDENTIALS_REPOSITORY) private readonly credentials: CredentialsRepositoryPort,
    @Inject(CREDENTIAL_ISSUER_PORT) private readonly issuer: CredentialIssuerPort,
  ) {}

  async execute(): Promise<ReissueSummary> {
    const targets = await this.credentials.listGrantedTargets();

    let regeneradas = 0;
    let fallidas = 0;
    for (const target of targets) {
      try {
        await this.issuer.issueFor(target.companyUserId, target.fullName);
        regeneradas += 1;
      } catch (error) {
        // One bad badge must not abort the whole batch.
        fallidas += 1;
        this.logger.warn(
          `Could not reissue the badge of membership ${target.companyUserId}: ${String(error)}`,
        );
      }
    }

    return { regeneradas, fallidas };
  }
}
