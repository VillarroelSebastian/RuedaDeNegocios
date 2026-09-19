import { Module } from '@nestjs/common';
import { MEETING_AGENDA_PORT } from '../asistente/application/ports/meeting-agenda.port.js';
import { MEETING_REPORT_PORT } from '../reportes/application/ports/meeting-report.port.js';
import { HorariosModule } from '../horarios/horarios.module.js';
import { MesasModule } from '../mesas/mesas.module.js';
import { SolicitudesModule } from '../solicitudes/solicitudes.module.js';
import { MEETING_MESSENGER_PORT } from './application/ports/meeting-messenger.port.js';
import {
  CancelOwnMeetingUseCase,
  CompleteOwnMeetingUseCase,
  ProposeRescheduleUseCase,
  RespondRescheduleUseCase,
  StartOwnMeetingUseCase,
} from './application/use-cases/company-meetings.use-cases.js';
import {
  GetCompanyAgendaUseCase,
  GetMeetingUseCase,
  ListEligibleCompaniesUseCase,
  ListIdleCompaniesUseCase,
  ListMeetingHistoryUseCase,
  ListMeetingsUseCase,
  ListOwnMeetingsUseCase,
} from './application/use-cases/read-meetings.use-cases.js';
import {
  ChangeMeetingStatusUseCase,
  CreateMeetingUseCase,
  EvaluateMeetingUseCase,
  MessageMeetingCompanyUseCase,
  SetMeetingLinkUseCase,
} from './application/use-cases/run-meetings.use-cases.js';
import {
  ListOwnMeetingResultsUseCase,
  RecordMeetingResultUseCase,
} from './application/use-cases/meeting-results.use-cases.js';
import {
  SendMeetingRemindersUseCase,
  SyncMeetingStatesUseCase,
} from './application/use-cases/meeting-automation.use-cases.js';
import { MEETINGS_REPOSITORY } from './domain/ports/meetings.repository.port.js';
import { AssistantMeetingAgendaAdapter } from './infrastructure/adapters/assistant-meeting-agenda.adapter.js';
import { ReportsMeetingAdapter } from './infrastructure/adapters/reports-meeting.adapter.js';
import { EmailMeetingMessengerAdapter } from './infrastructure/adapters/email-meeting-messenger.adapter.js';
import { MeetingsController } from './infrastructure/http/meetings.controller.js';
import { MeetingAutomationScheduler } from './infrastructure/scheduling/meeting-automation.scheduler.js';
import { PrismaMeetingsRepository } from './infrastructure/persistence/prisma-meetings.repository.js';

@Module({
  // Tables answer where a meeting can be placed, the schedule answers when, and
  // the requests context supplies the availability port both of them feed.
  imports: [MesasModule, HorariosModule, SolicitudesModule],
  controllers: [MeetingsController],
  providers: [
    ListMeetingsUseCase,
    GetMeetingUseCase,
    ListMeetingHistoryUseCase,
    ListIdleCompaniesUseCase,
    ListEligibleCompaniesUseCase,
    GetCompanyAgendaUseCase,
    ListOwnMeetingsUseCase,
    CreateMeetingUseCase,
    ChangeMeetingStatusUseCase,
    SetMeetingLinkUseCase,
    MessageMeetingCompanyUseCase,
    EvaluateMeetingUseCase,
    CancelOwnMeetingUseCase,
    StartOwnMeetingUseCase,
    CompleteOwnMeetingUseCase,
    ProposeRescheduleUseCase,
    RespondRescheduleUseCase,
    ListOwnMeetingResultsUseCase,
    RecordMeetingResultUseCase,
    // The event starts, warns and closes its own meetings.
    SyncMeetingStatesUseCase,
    SendMeetingRemindersUseCase,
    MeetingAutomationScheduler,
    { provide: MEETINGS_REPOSITORY, useClass: PrismaMeetingsRepository },
    { provide: MEETING_MESSENGER_PORT, useClass: EmailMeetingMessengerAdapter },
    // Which meetings are live, and which belong to the event, is a rule here.
    { provide: MEETING_AGENDA_PORT, useClass: AssistantMeetingAgendaAdapter },
    { provide: MEETING_REPORT_PORT, useClass: ReportsMeetingAdapter },
  ],
  exports: [MEETING_AGENDA_PORT, MEETING_REPORT_PORT],
})
export class ReunionesModule {}
