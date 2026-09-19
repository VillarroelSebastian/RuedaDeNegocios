import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CREDENTIAL_ISSUER_PORT,
  type CredentialIssuerPort,
} from '../ports/credential-issuer.port.js';
import {
  CREDENTIALS_REPOSITORY,
  type CredentialsRepositoryPort,
  type PrintableCredential,
  type PrintableEvent,
} from '../../domain/ports/credentials.repository.port.js';

export interface PrintableSheet {
  evento: PrintableEvent | null;
  /** Standard ID-card size, so the sheet prints at the right scale. */
  medidaMm: { ancho: number; alto: number };
  credenciales: PrintableCredential[];
}

const CARD_SIZE_MM = { ancho: 85.6, alto: 54 };

@Injectable()
export class GetPrintableCredentialsUseCase {
  private readonly logger = new Logger(GetPrintableCredentialsUseCase.name);

  constructor(
    @Inject(CREDENTIALS_REPOSITORY) private readonly credentials: CredentialsRepositoryPort,
    @Inject(CREDENTIAL_ISSUER_PORT) private readonly issuer: CredentialIssuerPort,
  ) {}

  async execute(companyUserId?: number): Promise<PrintableSheet> {
    const evento = await this.credentials.findPrintableEvent();
    if (!evento) return { evento: null, medidaMm: CARD_SIZE_MM, credenciales: [] };

    const targets = await this.credentials.listPrintableTargets(companyUserId);

    // Someone enabled before badges existed still has none; render it now
    // rather than printing a card with an empty square.
    for (const target of targets.filter((item) => !item.hasBadge)) {
      try {
        await this.issuer.issueFor(target.companyUserId, target.fullName);
      } catch (error) {
        this.logger.warn(
          `Could not issue the badge of membership ${target.companyUserId}: ${String(error)}`,
        );
      }
    }

    return {
      evento,
      medidaMm: CARD_SIZE_MM,
      credenciales: await this.credentials.listPrintable(
        targets.map((target) => target.companyUserId),
      ),
    };
  }
}
