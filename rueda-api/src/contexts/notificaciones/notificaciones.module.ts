import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { COMPANY_NOTIFIER_PORT } from '../../shared/application/ports/company-notifier.port.js';
import { REALTIME_PUBLISHER_PORT } from '../../shared/application/ports/realtime-publisher.port.js';
import { STAFF_NOTIFIER_PORT } from '../../shared/application/ports/staff-notifier.port.js';
import { ENV } from '../../shared/config/env.module.js';
import type { Env } from '../../shared/config/env.schema.js';
import {
  GetCompanyInboxUseCase,
  ListPendingWorkUseCase,
  ListStaffNotificationsUseCase,
  MarkCompanyInboxReadUseCase,
} from './application/use-cases/read-notifications.use-cases.js';
import { NOTIFICATIONS_REPOSITORY } from './domain/ports/notifications.repository.port.js';
import { PrismaCompanyNotifierAdapter } from './infrastructure/adapters/prisma-company-notifier.adapter.js';
import { PrismaStaffNotifierAdapter } from './infrastructure/adapters/prisma-staff-notifier.adapter.js';
import { NotificationsController } from './infrastructure/http/notifications.controller.js';
import { PrismaNotificationsRepository } from './infrastructure/persistence/prisma-notifications.repository.js';
import { NotificationsGateway } from './infrastructure/gateways/notifications.gateway.js';

/**
 * Global because almost every context notifies a company after it changes
 * something, and none of them should have to import this module to do it.
 */
@Global()
@Module({
  // The gateway verifies the handshake token itself. `JwtModule` is registered
  // per module in Nest, so this one needs its own registration: the one in
  // `AuthModule` is not visible here and the application would not even boot.
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({ secret: env.JWT_SECRET }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    GetCompanyInboxUseCase,
    MarkCompanyInboxReadUseCase,
    ListStaffNotificationsUseCase,
    ListPendingWorkUseCase,
    { provide: NOTIFICATIONS_REPOSITORY, useClass: PrismaNotificationsRepository },
    { provide: REALTIME_PUBLISHER_PORT, useExisting: NotificationsGateway },
    { provide: COMPANY_NOTIFIER_PORT, useClass: PrismaCompanyNotifierAdapter },
    { provide: STAFF_NOTIFIER_PORT, useClass: PrismaStaffNotifierAdapter },
  ],
  exports: [REALTIME_PUBLISHER_PORT, COMPANY_NOTIFIER_PORT, STAFF_NOTIFIER_PORT],
})
export class NotificacionesModule {}
