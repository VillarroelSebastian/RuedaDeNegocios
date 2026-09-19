import { Module } from '@nestjs/common';
import { NEWS_BRIEFING_PORT } from '../asistente/application/ports/news-briefing.port.js';
import { NEWS_REPORT_PORT } from '../reportes/application/ports/news-report.port.js';
import {
  DeleteNewsUseCase,
  PublishNewsUseCase,
  UpdateNewsUseCase,
} from './application/use-cases/manage-news.use-cases.js';
import {
  ListAllNewsUseCase,
  ListPublishedNewsUseCase,
} from './application/use-cases/read-news.use-cases.js';
import { NEWS_REPOSITORY } from './domain/ports/news.repository.port.js';
import { AssistantNewsBriefingAdapter } from './infrastructure/adapters/assistant-news-briefing.adapter.js';
import { ReportsNewsAdapter } from './infrastructure/adapters/reports-news.adapter.js';
import { NewsController } from './infrastructure/http/news.controller.js';
import { PrismaNewsRepository } from './infrastructure/persistence/prisma-news.repository.js';

@Module({
  controllers: [NewsController],
  providers: [
    ListPublishedNewsUseCase,
    ListAllNewsUseCase,
    PublishNewsUseCase,
    UpdateNewsUseCase,
    DeleteNewsUseCase,
    { provide: NEWS_REPOSITORY, useClass: PrismaNewsRepository },
    // What counts as published is a rule of this context.
    { provide: NEWS_BRIEFING_PORT, useClass: AssistantNewsBriefingAdapter },
    { provide: NEWS_REPORT_PORT, useClass: ReportsNewsAdapter },
  ],
  exports: [NEWS_BRIEFING_PORT, NEWS_REPORT_PORT],
})
export class NoticiasModule {}
