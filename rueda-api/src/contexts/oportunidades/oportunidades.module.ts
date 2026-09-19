import { Module } from '@nestjs/common';
import {
  ListEventPairingsUseCase,
  ListMyOpportunitiesUseCase,
} from './application/use-cases/list-opportunities.use-cases.js';
import { OPPORTUNITIES_REPOSITORY } from './domain/ports/opportunities.repository.port.js';
import { OpportunitiesController } from './infrastructure/http/opportunities.controller.js';
import { PrismaOpportunitiesRepository } from './infrastructure/persistence/prisma-opportunities.repository.js';

@Module({
  controllers: [OpportunitiesController],
  providers: [
    ListMyOpportunitiesUseCase,
    ListEventPairingsUseCase,
    { provide: OPPORTUNITIES_REPOSITORY, useClass: PrismaOpportunitiesRepository },
  ],
})
export class OportunidadesModule {}
