import { Module } from '@nestjs/common';
import { ACTIVITY_BRIEFING_PORT } from '../asistente/application/ports/activity-briefing.port.js';
import { ACTIVITY_REPORT_PORT } from '../reportes/application/ports/activity-report.port.js';
import {
  AnnounceOnActivityUseCase,
  RemoveActivityAnnouncementUseCase,
  SetActivitySubscriptionUseCase,
  SetLiveStatusUseCase,
} from './application/use-cases/live-schedule.use-cases.js';
import {
  CreateActivityUseCase,
  DeleteActivityUseCase,
  UpdateActivityUseCase,
} from './application/use-cases/manage-activities.use-cases.js';
import {
  GetLiveScheduleUseCase,
  ListActivitiesUseCase,
  ListOwnSubscriptionsUseCase,
  ListUpcomingActivitiesUseCase,
} from './application/use-cases/read-activities.use-cases.js';
import { ACTIVITIES_REPOSITORY } from './domain/ports/activities.repository.port.js';
import { AssistantActivityBriefingAdapter } from './infrastructure/adapters/assistant-activity-briefing.adapter.js';
import { ReportsActivityAdapter } from './infrastructure/adapters/reports-activity.adapter.js';
import { ActivitiesController } from './infrastructure/http/activities.controller.js';
import { PrismaActivitiesRepository } from './infrastructure/persistence/prisma-activities.repository.js';

@Module({
  controllers: [ActivitiesController],
  providers: [
    ListActivitiesUseCase,
    ListUpcomingActivitiesUseCase,
    GetLiveScheduleUseCase,
    ListOwnSubscriptionsUseCase,
    CreateActivityUseCase,
    UpdateActivityUseCase,
    DeleteActivityUseCase,
    SetActivitySubscriptionUseCase,
    AnnounceOnActivityUseCase,
    RemoveActivityAnnouncementUseCase,
    SetLiveStatusUseCase,
    { provide: ACTIVITIES_REPOSITORY, useClass: PrismaActivitiesRepository },
    // How a programme day and a room clock time are stored is a rule here.
    { provide: ACTIVITY_BRIEFING_PORT, useClass: AssistantActivityBriefingAdapter },
    { provide: ACTIVITY_REPORT_PORT, useClass: ReportsActivityAdapter },
  ],
  exports: [ACTIVITY_BRIEFING_PORT, ACTIVITY_REPORT_PORT],
})
export class ActividadesModule {}
