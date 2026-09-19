import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import { meetingWindow } from '../../../eventos/domain/services/event-schedule.js';
import {
  MEETINGS_REPOSITORY,
  type CompanyBrief,
  type MeetingFilters,
  type MeetingView,
  type MeetingsRepositoryPort,
  type OwnMeetingView,
} from '../../domain/ports/meetings.repository.port.js';

export interface CompanyAgendaView {
  empresa: CompanyBrief;
  empresaeventoId: number;
  reuniones: MeetingView[];
}

export interface IdleCompaniesView {
  empresas: CompanyBrief[];
  total: number;
}

/** The board the event team watches: every meeting of the running event. */
@Injectable()
export class ListMeetingsUseCase {
  constructor(@Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort) {}

  async execute(filters: MeetingFilters = {}): Promise<MeetingView[]> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return [];

    return this.meetings.list(event.id, meetingWindow(event), filters);
  }
}

@Injectable()
export class GetMeetingUseCase {
  constructor(@Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort) {}

  async execute(meetingId: number): Promise<MeetingView> {
    const event = await this.meetings.findPrincipalEvent();
    const meeting = event ? await this.meetings.findView(meetingId, event.id) : null;
    if (!meeting) throw new NotFoundError('Reunión no encontrada en el evento activo');

    return meeting;
  }
}

/**
 * What the event team reviews afterwards: the meetings that actually happened,
 * searchable by table number or by either company.
 */
@Injectable()
export class ListMeetingHistoryUseCase {
  constructor(@Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort) {}

  async execute(q?: string): Promise<MeetingView[]> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return [];

    return this.meetings.listFinished(event.id, meetingWindow(event), q);
  }
}

/** Who the team can walk up to right now, because they are not in a meeting. */
@Injectable()
export class ListIdleCompaniesUseCase {
  constructor(@Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort) {}

  async execute(): Promise<IdleCompaniesView> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return { empresas: [], total: 0 };

    const empresas = await this.meetings.listIdleCompanies(event.id);
    return { empresas, total: empresas.length };
  }
}

/** Who the team may book a meeting for at all. */
@Injectable()
export class ListEligibleCompaniesUseCase {
  constructor(@Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort) {}

  async execute(): Promise<CompanyBrief[]> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return [];

    return this.meetings.listEligibleCompanies(event.id);
  }
}

/** One company's day, as the team reads it over their shoulder. */
@Injectable()
export class GetCompanyAgendaUseCase {
  constructor(@Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort) {}

  async execute(companyEventId: number): Promise<CompanyAgendaView> {
    const event = await this.meetings.findPrincipalEvent();
    const empresa = event ? await this.meetings.findCompany(companyEventId, event.id) : null;
    if (!event || !empresa) {
      throw new NotFoundError('La empresa no pertenece al evento activo');
    }

    return {
      empresa,
      empresaeventoId: companyEventId,
      reuniones: await this.meetings.listOfCompanyForStaff(companyEventId, event.id),
    };
  }
}

/** The company's own meetings, the ones it asked for first. */
@Injectable()
export class ListOwnMeetingsUseCase {
  constructor(@Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepositoryPort) {}

  async execute(companyEventId: number): Promise<OwnMeetingView[]> {
    const event = await this.meetings.findPrincipalEvent();
    if (!event) return [];

    return this.meetings.listOf(companyEventId, meetingWindow(event));
  }
}
