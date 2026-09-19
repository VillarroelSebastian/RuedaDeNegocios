import { Module } from '@nestjs/common';
import { STAFF_CREDENTIALS_NOTIFIER } from './application/ports/staff-notifier.port.js';
import {
  CreateTechnicianUseCase,
  DeleteTechnicianUseCase,
  ListTechniciansUseCase,
  ResendTechnicianCredentialsUseCase,
  UpdateTechnicianUseCase,
} from './application/use-cases/manage-technicians.use-cases.js';
import {
  GetOwnProfileUseCase,
  UpdateOwnProfileUseCase,
} from './application/use-cases/own-profile.use-cases.js';
import { STAFF_REPOSITORY } from './domain/ports/staff.repository.port.js';
import { EmailStaffCredentialsAdapter } from './infrastructure/adapters/email-staff-credentials.adapter.js';
import { ProfileController } from './infrastructure/http/profile.controller.js';
import { TechniciansController } from './infrastructure/http/technicians.controller.js';
import { PrismaStaffRepository } from './infrastructure/persistence/prisma-staff.repository.js';

/** The accounts of the people who run the event, and everybody's own profile. */
@Module({
  controllers: [TechniciansController, ProfileController],
  providers: [
    ListTechniciansUseCase,
    CreateTechnicianUseCase,
    UpdateTechnicianUseCase,
    DeleteTechnicianUseCase,
    ResendTechnicianCredentialsUseCase,
    GetOwnProfileUseCase,
    UpdateOwnProfileUseCase,
    { provide: STAFF_REPOSITORY, useClass: PrismaStaffRepository },
    { provide: STAFF_CREDENTIALS_NOTIFIER, useClass: EmailStaffCredentialsAdapter },
  ],
})
export class UsuariosModule {}
