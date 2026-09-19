import { Module } from '@nestjs/common';
import { CREDENTIAL_ISSUER_PORT } from './application/ports/credential-issuer.port.js';
import { CREDENTIAL_READER_PORT } from './application/ports/credential-reader.port.js';
import { GetPrintableCredentialsUseCase } from './application/use-cases/get-printable-credentials.use-case.js';
import { ReadCredentialUseCase } from './application/use-cases/read-credential.use-case.js';
import { ReissueCredentialsUseCase } from './application/use-cases/reissue-credentials.use-case.js';
import { CREDENTIALS_REPOSITORY } from './domain/ports/credentials.repository.port.js';
import { QrCredentialIssuerAdapter } from './infrastructure/adapters/qr-credential-issuer.adapter.js';
import { CredentialsController } from './infrastructure/http/credentials.controller.js';
import { PrismaCredentialsRepository } from './infrastructure/persistence/prisma-credentials.repository.js';

@Module({
  controllers: [CredentialsController],
  providers: [
    ReadCredentialUseCase,
    ReissueCredentialsUseCase,
    GetPrintableCredentialsUseCase,
    { provide: CREDENTIALS_REPOSITORY, useClass: PrismaCredentialsRepository },
    { provide: CREDENTIAL_ISSUER_PORT, useClass: QrCredentialIssuerAdapter },
    // The reader is the use case itself: other contexts consume it as a port.
    { provide: CREDENTIAL_READER_PORT, useExisting: ReadCredentialUseCase },
  ],
  exports: [CREDENTIAL_ISSUER_PORT, CREDENTIAL_READER_PORT],
})
export class CredencialesModule {}
