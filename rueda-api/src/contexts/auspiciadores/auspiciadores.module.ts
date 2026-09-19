import { Module } from '@nestjs/common';
import {
  SPONSOR_CREDENTIAL_ISSUER_PORT,
  SPONSOR_NOTIFIER_PORT,
} from './application/ports/sponsor-credential.port.js';
import {
  CreateSponsorUseCase,
  DeleteSponsorUseCase,
  GetSponsorUseCase,
  ListSponsorsUseCase,
  UpdateSponsorUseCase,
} from './application/use-cases/manage-sponsors.use-cases.js';
import {
  CheckSponsorCredentialUseCase,
  ListSponsorAttendanceUseCase,
  ReadSponsorCredentialUseCase,
  RecordSponsorAttendanceUseCase,
} from './application/use-cases/sponsor-attendance.use-cases.js';
import { SPONSORS_REPOSITORY } from './domain/ports/sponsors.repository.port.js';
import { EmailSponsorNotifierAdapter } from './infrastructure/adapters/email-sponsor-notifier.adapter.js';
import { QrSponsorCredentialAdapter } from './infrastructure/adapters/qr-sponsor-credential.adapter.js';
import { SponsorsController } from './infrastructure/http/sponsors.controller.js';
import { PrismaSponsorsRepository } from './infrastructure/persistence/prisma-sponsors.repository.js';

@Module({
  controllers: [SponsorsController],
  providers: [
    ListSponsorsUseCase,
    GetSponsorUseCase,
    CreateSponsorUseCase,
    UpdateSponsorUseCase,
    DeleteSponsorUseCase,
    ReadSponsorCredentialUseCase,
    CheckSponsorCredentialUseCase,
    RecordSponsorAttendanceUseCase,
    ListSponsorAttendanceUseCase,
    { provide: SPONSORS_REPOSITORY, useClass: PrismaSponsorsRepository },
    { provide: SPONSOR_CREDENTIAL_ISSUER_PORT, useClass: QrSponsorCredentialAdapter },
    { provide: SPONSOR_NOTIFIER_PORT, useClass: EmailSponsorNotifierAdapter },
  ],
})
export class AuspiciadoresModule {}
