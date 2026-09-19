import { Module } from '@nestjs/common';
import { REGISTRATION_NOTIFIER } from './application/ports/registration-notifier.port.js';
import { CheckAvailabilityUseCase } from './application/use-cases/check-availability.use-case.js';
import { ListRegistrationCitiesUseCase } from './application/use-cases/list-registration-cities.use-case.js';
import { RegisterCompanyUseCase } from './application/use-cases/register-company.use-case.js';
import {
  GetEnrollmentTrackingUseCase,
  ResubmitReceiptUseCase,
} from './application/use-cases/track-enrollment.use-cases.js';
import { REGISTRATION_REPOSITORY } from './domain/ports/registration.repository.port.js';
import { EmailRegistrationNotifierAdapter } from './infrastructure/adapters/email-registration-notifier.adapter.js';
import { RegistrationController } from './infrastructure/http/registration.controller.js';
import { PrismaRegistrationRepository } from './infrastructure/persistence/prisma-registration.repository.js';

@Module({
  controllers: [RegistrationController],
  providers: [
    CheckAvailabilityUseCase,
    ListRegistrationCitiesUseCase,
    RegisterCompanyUseCase,
    GetEnrollmentTrackingUseCase,
    ResubmitReceiptUseCase,
    { provide: REGISTRATION_REPOSITORY, useClass: PrismaRegistrationRepository },
    { provide: REGISTRATION_NOTIFIER, useClass: EmailRegistrationNotifierAdapter },
  ],
})
export class RegistroModule {}
