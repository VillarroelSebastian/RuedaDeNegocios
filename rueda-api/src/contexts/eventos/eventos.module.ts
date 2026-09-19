import { Module } from '@nestjs/common';
import { EVENT_BRIEFING_PORT } from '../asistente/application/ports/event-briefing.port.js';
import { EVENT_REPORT_PORT } from '../reportes/application/ports/event-report.port.js';
import { MesasModule } from '../mesas/mesas.module.js';
import { CreateEventUseCase } from './application/use-cases/create-event.use-case.js';
import { DeleteEventUseCase } from './application/use-cases/delete-event.use-case.js';
import { GetCurrentEventBrandingUseCase } from './application/use-cases/get-current-event-branding.use-case.js';
import { GetCurrentEventConfigUseCase } from './application/use-cases/get-current-event-config.use-case.js';
import { GetCurrentEventUseCase } from './application/use-cases/get-current-event.use-case.js';
import { GetEventUseCase } from './application/use-cases/get-event.use-case.js';
import { ListEventsUseCase } from './application/use-cases/list-events.use-case.js';
import { SetPrincipalEventUseCase } from './application/use-cases/set-principal-event.use-case.js';
import { UpdateCurrentEventConfigUseCase } from './application/use-cases/update-current-event-config.use-case.js';
import { UpdateEventUseCase } from './application/use-cases/update-event.use-case.js';
import { EVENT_REPOSITORY } from './domain/ports/event.repository.port.js';
import { AssistantEventBriefingAdapter } from './infrastructure/adapters/assistant-event-briefing.adapter.js';
import { ReportsEventAdapter } from './infrastructure/adapters/reports-event.adapter.js';
import { EventsController } from './infrastructure/http/events.controller.js';
import { PrismaEventRepository } from './infrastructure/persistence/prisma-event.repository.js';

@Module({
  // `TABLE_PROVISIONING_PORT` is declared here because this context triggers a
  // sync after the event capacity changes, but the tables context implements it.
  imports: [MesasModule],
  controllers: [EventsController],
  providers: [
    GetCurrentEventUseCase,
    GetCurrentEventBrandingUseCase,
    GetCurrentEventConfigUseCase,
    UpdateCurrentEventConfigUseCase,
    ListEventsUseCase,
    GetEventUseCase,
    CreateEventUseCase,
    UpdateEventUseCase,
    SetPrincipalEventUseCase,
    DeleteEventUseCase,
    { provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
    // The assistant asks about the event; the window it runs in is a rule of
    // this context, so the answer is built here.
    { provide: EVENT_BRIEFING_PORT, useClass: AssistantEventBriefingAdapter },
    { provide: EVENT_REPORT_PORT, useClass: ReportsEventAdapter },
  ],
  exports: [EVENT_REPOSITORY, EVENT_BRIEFING_PORT, EVENT_REPORT_PORT],
})
export class EventosModule {}
