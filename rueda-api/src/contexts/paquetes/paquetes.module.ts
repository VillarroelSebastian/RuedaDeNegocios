import { Module } from '@nestjs/common';
import {
  CreatePackageUseCase,
  DeletePackageUseCase,
  GetOwnPackageUseCase,
  ListPackageUsageUseCase,
  ListPackagesUseCase,
  UpdatePackageUseCase,
} from './application/use-cases/manage-packages.use-cases.js';
import { PACKAGES_REPOSITORY } from './domain/ports/packages.repository.port.js';
import { PackagesController } from './infrastructure/http/packages.controller.js';
import { PrismaPackagesRepository } from './infrastructure/persistence/prisma-packages.repository.js';

@Module({
  controllers: [PackagesController],
  providers: [
    ListPackagesUseCase,
    ListPackageUsageUseCase,
    GetOwnPackageUseCase,
    CreatePackageUseCase,
    UpdatePackageUseCase,
    DeletePackageUseCase,
    { provide: PACKAGES_REPOSITORY, useClass: PrismaPackagesRepository },
  ],
})
export class PaquetesModule {}
