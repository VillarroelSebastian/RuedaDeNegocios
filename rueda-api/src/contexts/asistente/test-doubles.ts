import type { ClockPort } from '../../shared/application/ports/clock.port.js';
import type { TimeWindow } from '../../shared/domain/bolivia-time.js';
import type { ActivityBriefingPort } from './application/ports/activity-briefing.port.js';
import type { AgendaSuggestionsPort } from './application/ports/agenda-suggestions.port.js';
import type { CompanyDirectoryPort } from './application/ports/company-directory.port.js';
import type { EnrollmentStatusPort } from './application/ports/enrollment-status.port.js';
import type { EventBriefingPort } from './application/ports/event-briefing.port.js';
import type { FreeTablesPort } from './application/ports/free-tables.port.js';
import type { AssistantBooking, MeetingBookingPort } from './application/ports/meeting-booking.port.js';
import type { MeetingAgendaPort } from './application/ports/meeting-agenda.port.js';
import type { NewsBriefingPort } from './application/ports/news-briefing.port.js';
import type { RequestStatusPort } from './application/ports/request-status.port.js';
import type {
  AgendaSuggestions,
  AssistantActivity,
  AssistantCompany,
  AssistantEnrollmentStatus,
  AssistantMeeting,
  AssistantNews,
  AssistantTable,
  EventBriefing,
} from './domain/models/assistant-view.js';

/** In-memory doubles of every port the assistant speaks through. */

export const EVENT_ID = 4;
export const COMPANY_EVENT_ID = 11;
export const COMPANY_USER_ID = 77;
export const COUNTERPART_ID = 22;

export function buildEvent(overrides: Partial<EventBriefing> = {}): EventBriefing {
  return {
    id: EVENT_ID,
    nombre: 'Rueda de Negocios Beni',
    inicio: new Date('2026-09-20T12:00:00.000Z'),
    fin: new Date('2026-09-21T22:00:00.000Z'),
    urlImagenMapaRecinto: null,
    urlImagenCronogramaCharlas: null,
    ...overrides,
  };
}

export function buildCompany(overrides: Partial<AssistantCompany> = {}): AssistantCompany {
  return {
    empresaeventoId: COUNTERPART_ID,
    nombre: 'Constructora Sur',
    codigo: 'RB-CON-2',
    rubro: 'Industria y Manufactura',
    oferta: null,
    ...overrides,
  };
}

export function buildMeeting(overrides: Partial<AssistantMeeting> = {}): AssistantMeeting {
  return {
    inicio: new Date('2026-09-20T17:00:00.000Z'),
    fin: new Date('2026-09-20T17:20:00.000Z'),
    estadoReunion: 'PROGRAMADA',
    tipoReunion: 'PRESENCIAL',
    contraparte: 'Constructora Sur',
    numeroMesa: 5,
    ...overrides,
  };
}

export class FakeEventBriefing implements EventBriefingPort {
  constructor(private readonly event: EventBriefing | null = buildEvent()) {}

  async findBriefing(): Promise<EventBriefing | null> {
    return this.event;
  }
}

export interface FakeCompanyDirectoryOptions {
  eventId?: number | null;
  enabled?: AssistantCompany[];
  found?: AssistantCompany | null;
  bookable?: AssistantCompany[];
}

export class FakeCompanyDirectory implements CompanyDirectoryPort {
  readonly bookableCalls: { term: string; except: number }[] = [];

  constructor(private readonly options: FakeCompanyDirectoryOptions = {}) {}

  async findActiveEventOf(): Promise<number | null> {
    return this.options.eventId === undefined ? EVENT_ID : this.options.eventId;
  }

  async listEnabled(): Promise<AssistantCompany[]> {
    return this.options.enabled ?? [buildCompany()];
  }

  async findByTerm(): Promise<AssistantCompany | null> {
    return this.options.found === undefined ? buildCompany() : this.options.found;
  }

  async listBookable(
    _eventId: number,
    exceptCompanyEventId: number,
    term: string,
  ): Promise<AssistantCompany[]> {
    this.bookableCalls.push({ term, except: exceptCompanyEventId });
    return this.options.bookable ?? [buildCompany()];
  }
}

export class FakeMeetingAgenda implements MeetingAgendaPort {
  constructor(
    private readonly options: {
      accepted?: AssistantMeeting[];
      next?: AssistantMeeting | null;
      withTable?: AssistantMeeting | null;
    } = {},
  ) {}

  async listAccepted(): Promise<AssistantMeeting[]> {
    return this.options.accepted ?? [buildMeeting()];
  }

  async findNext(): Promise<AssistantMeeting | null> {
    return this.options.next === undefined ? buildMeeting() : this.options.next;
  }

  async findNextWithTable(): Promise<AssistantMeeting | null> {
    return this.options.withTable === undefined ? buildMeeting() : this.options.withTable;
  }
}

export class FakeActivityBriefing implements ActivityBriefingPort {
  constructor(private readonly activities: AssistantActivity[] = []) {}

  async listUpcoming(): Promise<AssistantActivity[]> {
    return this.activities;
  }
}

export class FakeNewsBriefing implements NewsBriefingPort {
  constructor(private readonly news: AssistantNews[] = []) {}

  async listPublished(): Promise<AssistantNews[]> {
    return this.news;
  }
}

export class FakeEnrollmentStatus implements EnrollmentStatusPort {
  constructor(
    private readonly status: AssistantEnrollmentStatus | null = {
      paqueteNombre: 'Paquete Beni',
      estadoVerificacionPago: 'COMPLETADO',
      montoPagado: 1500,
      participantesUsados: 3,
      participantesTotales: 4,
    },
  ) {}

  async findStatus(): Promise<AssistantEnrollmentStatus | null> {
    return this.status;
  }
}

export class FakeRequestStatus implements RequestStatusPort {
  constructor(private readonly pending = 0) {}

  async countPending(): Promise<number> {
    return this.pending;
  }
}

export class FakeAgendaSuggestions implements AgendaSuggestionsPort {
  constructor(
    private readonly agenda: AgendaSuggestions = {
      slots: [
        new Date('2026-09-20T17:00:00.000Z'),
        new Date('2026-09-20T17:20:00.000Z'),
      ],
      duracionMinutos: 20,
    },
  ) {}

  async listFreeSlots(): Promise<AgendaSuggestions> {
    return this.agenda;
  }
}

export class FakeFreeTables implements FreeTablesPort {
  readonly windows: TimeWindow[] = [];

  constructor(private readonly tables: AssistantTable[] = [{ id: 3, numeroMesa: 5 }]) {}

  async listFree(window: TimeWindow): Promise<AssistantTable[]> {
    this.windows.push(window);
    return this.tables;
  }
}

export class FakeMeetingBooking implements MeetingBookingPort {
  readonly requested: AssistantBooking[] = [];

  constructor(private readonly failure: Error | null = null) {}

  async request(booking: AssistantBooking): Promise<void> {
    if (this.failure) throw this.failure;
    this.requested.push(booking);
  }
}

export class FixedClock implements ClockPort {
  constructor(private readonly instant = new Date('2026-09-20T15:00:00.000Z')) {}

  now(): Date {
    return this.instant;
  }
}
