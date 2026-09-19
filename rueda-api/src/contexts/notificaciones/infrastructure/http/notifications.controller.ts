import { Controller, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import {
  type AuthenticatedUser,
  enrollmentOf,
} from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  GetCompanyInboxUseCase,
  ListPendingWorkUseCase,
  ListStaffNotificationsUseCase,
  MarkCompanyInboxReadUseCase,
} from '../../application/use-cases/read-notifications.use-cases.js';
import type {
  CompanyInbox,
  PendingWork,
  StaffNotificationView,
} from '../../domain/ports/notifications.repository.port.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

/**
 * Reading what the rest of the API writes. Every context notifies through
 * `CompanyNotifierPort` and `StaffNotifierPort`; this is where those notices
 * are read back.
 *
 * Replaces `GET /empresa/notificaciones`, `PUT /empresa/notificaciones/leidas`,
 * `GET /tecnico/notificaciones-reuniones` and `GET /admin/notificaciones`. The
 * last one was never a notification list: it is work waiting, derived from the
 * registrations and receipts themselves, and it is named for that now.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getInbox: GetCompanyInboxUseCase,
    private readonly markRead: MarkCompanyInboxReadUseCase,
    private readonly listStaff: ListStaffNotificationsUseCase,
    private readonly listPendingWork: ListPendingWorkUseCase,
  ) {}

  // The literal routes are declared before anything parametrised.

  @Roles(ROLES.EMPRESA)
  @Get()
  inbox(@CurrentUser() user: AuthenticatedUser): Promise<CompanyInbox> {
    return this.getInbox.execute(enrollmentOf(user));
  }

  @Roles(ROLES.EMPRESA)
  @Put('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  read(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.markRead.execute(enrollmentOf(user));
  }

  /** The board of the event team, urgent first. */
  @Roles(...STAFF)
  @Get('staff')
  staff(): Promise<StaffNotificationView[]> {
    return this.listStaff.execute();
  }

  /** Registrations and receipts an administrator still has to look at. */
  @Roles(ROLES.ADMIN)
  @Get('pending-work')
  pendingWork(): Promise<PendingWork> {
    return this.listPendingWork.execute();
  }
}
