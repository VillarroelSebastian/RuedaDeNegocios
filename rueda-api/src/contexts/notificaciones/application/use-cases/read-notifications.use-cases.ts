import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATIONS_REPOSITORY,
  type CompanyInbox,
  type NotificationsRepositoryPort,
  type PendingWork,
  type StaffNotificationView,
} from '../../domain/ports/notifications.repository.port.js';

/** A bell shows what is recent, not everything that ever happened. */
const COMPANY_PAGE = 30;
const STAFF_PAGE = 50;

/** The bell of one company: its latest notices and how many it has not read. */
@Injectable()
export class GetCompanyInboxUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepositoryPort,
  ) {}

  async execute(companyEventId: number): Promise<CompanyInbox> {
    const [notificaciones, noLeidas] = await Promise.all([
      this.notifications.listForCompany(companyEventId, COMPANY_PAGE),
      this.notifications.countUnreadForCompany(companyEventId),
    ]);

    return { noLeidas, notificaciones };
  }
}

@Injectable()
export class MarkCompanyInboxReadUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepositoryPort,
  ) {}

  async execute(companyEventId: number): Promise<void> {
    await this.notifications.markAllReadForCompany(companyEventId);
  }
}

/** The board of the event team, urgent first. */
@Injectable()
export class ListStaffNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepositoryPort,
  ) {}

  async execute(): Promise<StaffNotificationView[]> {
    const eventId = await this.notifications.findPrincipalEventId();
    if (!eventId) return [];

    return this.notifications.listForStaff(eventId, STAFF_PAGE);
  }
}

/**
 * What an administrator still has to look at. It is derived from the work
 * itself — registrations waiting, receipts under review — rather than from
 * stored notices, so it cannot fall out of step with what is really pending.
 */
@Injectable()
export class ListPendingWorkUseCase {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notifications: NotificationsRepositoryPort,
  ) {}

  async execute(): Promise<PendingWork> {
    const eventId = await this.notifications.findPrincipalEventId();
    if (!eventId) return { items: [], total: 0 };

    return this.notifications.listPendingWork(eventId);
  }
}
