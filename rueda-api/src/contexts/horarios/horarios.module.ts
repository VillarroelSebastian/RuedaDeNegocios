import { Module } from '@nestjs/common';
import { AGENDA_SUGGESTIONS_PORT } from '../asistente/application/ports/agenda-suggestions.port.js';
import {
  ClearOwnBlocksUseCase,
  GetOwnDailyAvailabilityUseCase,
  ListOwnRangesUseCase,
  ListOwnSlotsUseCase,
  ReplaceOwnRangesUseCase,
  SaveOwnDailyAvailabilityUseCase,
  ToggleOwnSlotUseCase,
} from './application/use-cases/manage-availability.use-cases.js';
import {
  GetAgendaUseCase,
  GetStaffAgendaUseCase,
} from './application/use-cases/read-agenda.use-cases.js';
import { SCHEDULE_REPOSITORY } from './domain/ports/schedule.repository.port.js';
import { AssistantAgendaSuggestionsAdapter } from './infrastructure/adapters/assistant-agenda-suggestions.adapter.js';
import { ScheduleController } from './infrastructure/http/schedule.controller.js';
import { PrismaScheduleRepository } from './infrastructure/persistence/prisma-schedule.repository.js';

@Module({
  controllers: [ScheduleController],
  providers: [
    GetAgendaUseCase,
    GetStaffAgendaUseCase,
    ListOwnRangesUseCase,
    ReplaceOwnRangesUseCase,
    GetOwnDailyAvailabilityUseCase,
    SaveOwnDailyAvailabilityUseCase,
    ListOwnSlotsUseCase,
    ClearOwnBlocksUseCase,
    ToggleOwnSlotUseCase,
    { provide: SCHEDULE_REPOSITORY, useClass: PrismaScheduleRepository },
    // The assistant offers slots out of this same agenda, so it can never
    // suggest one the picker would refuse.
    { provide: AGENDA_SUGGESTIONS_PORT, useClass: AssistantAgendaSuggestionsAdapter },
  ],
  // The requests context asks the agenda whether a slot is still free.
  exports: [GetAgendaUseCase, AGENDA_SUGGESTIONS_PORT],
})
export class HorariosModule {}
