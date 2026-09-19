import { Module } from '@nestjs/common';
import { COMPANY_DIRECTORY_PORT } from '../asistente/application/ports/company-directory.port.js';
import { COMPANY_REPORT_PORT } from '../reportes/application/ports/company-report.port.js';
import { GetCompanyDossierUseCase } from './application/use-cases/get-company-dossier.use-case.js';
import { GetDirectoryEntryUseCase } from './application/use-cases/get-directory-entry.use-case.js';
import { GetOwnCompanyUseCase } from './application/use-cases/get-own-company.use-case.js';
import { ListCompaniesUseCase } from './application/use-cases/list-companies.use-case.js';
import { ListCompanyParticipantsUseCase } from './application/use-cases/list-company-participants.use-case.js';
import { ListDirectoryUseCase } from './application/use-cases/list-directory.use-case.js';
import { RemoveCompanyFromEventUseCase } from './application/use-cases/remove-company-from-event.use-case.js';
import { UpdateCommercialProfileUseCase } from './application/use-cases/update-commercial-profile.use-case.js';
import { UpdateCompanyBasicsUseCase } from './application/use-cases/update-company-basics.use-case.js';
import { UpdateCompanyLogoUseCase } from './application/use-cases/update-company-logo.use-case.js';
import { UpdateOwnProfileUseCase } from './application/use-cases/update-own-profile.use-case.js';
import { COMPANY_REPOSITORY } from './domain/ports/company.repository.port.js';
import { AssistantCompanyDirectoryAdapter } from './infrastructure/adapters/assistant-company-directory.adapter.js';
import { ReportsCompanyAdapter } from './infrastructure/adapters/reports-company.adapter.js';
import { CompaniesController } from './infrastructure/http/companies.controller.js';
import { DirectoryController } from './infrastructure/http/directory.controller.js';
import { PrismaCompanyRepository } from './infrastructure/persistence/prisma-company.repository.js';

@Module({
  controllers: [CompaniesController, DirectoryController],
  providers: [
    ListCompaniesUseCase,
    GetCompanyDossierUseCase,
    UpdateCompanyBasicsUseCase,
    RemoveCompanyFromEventUseCase,
    ListCompanyParticipantsUseCase,
    GetOwnCompanyUseCase,
    UpdateOwnProfileUseCase,
    UpdateCommercialProfileUseCase,
    UpdateCompanyLogoUseCase,
    ListDirectoryUseCase,
    GetDirectoryEntryUseCase,
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
    // What makes a company visible, and bookable, is a rule of this context.
    { provide: COMPANY_DIRECTORY_PORT, useClass: AssistantCompanyDirectoryAdapter },
    { provide: COMPANY_REPORT_PORT, useClass: ReportsCompanyAdapter },
  ],
  exports: [COMPANY_REPOSITORY, COMPANY_DIRECTORY_PORT, COMPANY_REPORT_PORT],
})
export class EmpresasModule {}
