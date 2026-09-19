import { Module } from '@nestjs/common';
import { MEETING_BOOKING_PORT } from '../asistente/application/ports/meeting-booking.port.js';
import { REQUEST_STATUS_PORT } from '../asistente/application/ports/request-status.port.js';
import { REQUEST_REPORT_PORT } from '../reportes/application/ports/request-report.port.js';
import { HorariosModule } from '../horarios/horarios.module.js';
import { MesasModule } from '../mesas/mesas.module.js';
import { SLOT_AVAILABILITY_PORT } from './application/ports/slot-availability.port.js';
import { ListMeetingRequestsUseCase } from './application/use-cases/list-requests.use-case.js';
import {
  AcceptMeetingRequestUseCase,
  CancelMeetingRequestUseCase,
  CreateMeetingRequestUseCase,
  EditMeetingRequestUseCase,
  RejectMeetingRequestUseCase,
} from './application/use-cases/manage-requests.use-cases.js';
import { MEETING_REQUESTS_REPOSITORY } from './domain/ports/meeting-requests.repository.port.js';
import { AgendaSlotAvailabilityAdapter } from './infrastructure/adapters/agenda-slot-availability.adapter.js';
import { AssistantMeetingBookingAdapter } from './infrastructure/adapters/assistant-meeting-booking.adapter.js';
import { AssistantRequestStatusAdapter } from './infrastructure/adapters/assistant-request-status.adapter.js';
import { ReportsRequestAdapter } from './infrastructure/adapters/reports-request.adapter.js';
import { MeetingRequestsController } from './infrastructure/http/meeting-requests.controller.js';
import { PrismaMeetingRequestsRepository } from './infrastructure/persistence/prisma-meeting-requests.repository.js';

@Module({
  // Tables answer where a meeting can be placed, and the schedule answers when.
  imports: [MesasModule, HorariosModule],
  controllers: [MeetingRequestsController],
  providers: [
    ListMeetingRequestsUseCase,
    CreateMeetingRequestUseCase,
    EditMeetingRequestUseCase,
    AcceptMeetingRequestUseCase,
    RejectMeetingRequestUseCase,
    CancelMeetingRequestUseCase,
    { provide: MEETING_REQUESTS_REPOSITORY, useClass: PrismaMeetingRequestsRepository },
    { provide: SLOT_AVAILABILITY_PORT, useClass: AgendaSlotAvailabilityAdapter },
    // The assistant collects the answers, but the request is created here, so
    // every rule that can refuse a booking is checked in one place.
    { provide: MEETING_BOOKING_PORT, useClass: AssistantMeetingBookingAdapter },
    { provide: REQUEST_STATUS_PORT, useClass: AssistantRequestStatusAdapter },
    { provide: REQUEST_REPORT_PORT, useClass: ReportsRequestAdapter },
  ],
  // The meetings context asks the same question when an hour is moved.
  exports: [SLOT_AVAILABILITY_PORT, MEETING_BOOKING_PORT, REQUEST_STATUS_PORT, REQUEST_REPORT_PORT],
})
export class SolicitudesModule {}
