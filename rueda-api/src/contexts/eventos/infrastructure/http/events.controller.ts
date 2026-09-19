import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ROLES } from '../../../../shared/domain/role.js';
import { Public } from '../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import { CreateEventUseCase } from '../../application/use-cases/create-event.use-case.js';
import { DeleteEventUseCase } from '../../application/use-cases/delete-event.use-case.js';
import {
  type EventBranding,
  GetCurrentEventBrandingUseCase,
} from '../../application/use-cases/get-current-event-branding.use-case.js';
import {
  type EventConfigView,
  GetCurrentEventConfigUseCase,
} from '../../application/use-cases/get-current-event-config.use-case.js';
import {
  type CurrentEventView,
  GetCurrentEventUseCase,
} from '../../application/use-cases/get-current-event.use-case.js';
import { GetEventUseCase } from '../../application/use-cases/get-event.use-case.js';
import { ListEventsUseCase } from '../../application/use-cases/list-events.use-case.js';
import { SetPrincipalEventUseCase } from '../../application/use-cases/set-principal-event.use-case.js';
import { UpdateCurrentEventConfigUseCase } from '../../application/use-cases/update-current-event-config.use-case.js';
import { UpdateEventUseCase } from '../../application/use-cases/update-event.use-case.js';
import type { EventRecord } from '../../domain/ports/event.repository.port.js';
import { SaveEventDto, UpdateEventConfigDto } from './dto/event.dto.js';

/** Staff allowed to curate event content, as in the legacy panel. */
const CONTENT_STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

@Controller('events')
export class EventsController {
  constructor(
    private readonly getCurrent: GetCurrentEventUseCase,
    private readonly getBranding: GetCurrentEventBrandingUseCase,
    private readonly getConfig: GetCurrentEventConfigUseCase,
    private readonly updateConfig: UpdateCurrentEventConfigUseCase,
    private readonly listEvents: ListEventsUseCase,
    private readonly getEvent: GetEventUseCase,
    private readonly createEvent: CreateEventUseCase,
    private readonly updateEvent: UpdateEventUseCase,
    private readonly setPrincipal: SetPrincipalEventUseCase,
    private readonly deleteEvent: DeleteEventUseCase,
  ) {}

  // `current` is declared before `:id` so it is never swallowed by the id route.

  /** Replaces `GET /public/evento` and `GET /empresa/evento`. */
  @Public()
  @Get('current')
  current(): Promise<CurrentEventView | null> {
    return this.getCurrent.execute();
  }

  /** Replaces `GET /evento-principal`. */
  @Public()
  @Get('current/branding')
  branding(): Promise<EventBranding> {
    return this.getBranding.execute();
  }

  @Roles(ROLES.ADMIN)
  @Get('current/config')
  config(): Promise<EventConfigView> {
    return this.getConfig.execute();
  }

  @Roles(ROLES.ADMIN)
  @Patch('current/config')
  patchConfig(@Body() dto: UpdateEventConfigDto): Promise<EventConfigView> {
    return this.updateConfig.execute(dto);
  }

  @Roles(...CONTENT_STAFF)
  @Get()
  list(): Promise<EventRecord[]> {
    return this.listEvents.execute();
  }

  @Roles(...CONTENT_STAFF)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: SaveEventDto): Promise<EventRecord> {
    return this.createEvent.execute(dto);
  }

  @Roles(...CONTENT_STAFF)
  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number): Promise<EventRecord> {
    return this.getEvent.execute(id);
  }

  @Roles(...CONTENT_STAFF)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveEventDto): Promise<EventRecord> {
    return this.updateEvent.execute(id, dto);
  }

  /** Publishes an event as the one currently running. */
  @Roles(ROLES.ADMIN)
  @Put(':id/principal')
  publish(@Param('id', ParseIntPipe) id: number): Promise<EventRecord> {
    return this.setPrincipal.execute(id);
  }

  @Roles(ROLES.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deleteEvent.execute(id);
  }
}
