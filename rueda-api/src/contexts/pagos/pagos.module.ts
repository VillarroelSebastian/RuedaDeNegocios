import { Module } from '@nestjs/common';
import { ENROLLMENT_STATUS_PORT } from '../asistente/application/ports/enrollment-status.port.js';
import { CredencialesModule } from '../credenciales/credenciales.module.js';
import { PAYMENT_NOTIFIER_PORT } from './application/ports/payment-notifier.port.js';
import { ApproveEnrollmentPaymentUseCase } from './application/use-cases/approve-enrollment-payment.use-case.js';
import {
  GetPaymentUseCase,
  ListPaymentsUseCase,
  ObserveEnrollmentPaymentUseCase,
  RejectEnrollmentPaymentUseCase,
} from './application/use-cases/review-enrollment-payment.use-cases.js';
import {
  ApproveTopUpUseCase,
  ListOwnTopUpsUseCase,
  ListTopUpsUnderReviewUseCase,
  ObserveTopUpUseCase,
  QuoteTopUpUseCase,
  RejectTopUpUseCase,
  RequestTopUpUseCase,
} from './application/use-cases/top-up.use-cases.js';
import { PAYMENTS_REPOSITORY } from './domain/ports/payments.repository.port.js';
import { AssistantEnrollmentStatusAdapter } from './infrastructure/adapters/assistant-enrollment-status.adapter.js';
import { EmailPaymentNotifierAdapter } from './infrastructure/adapters/email-payment-notifier.adapter.js';
import { PaymentsController } from './infrastructure/http/payments.controller.js';
import { TopUpsController } from './infrastructure/http/top-ups.controller.js';
import { PrismaPaymentsRepository } from './infrastructure/persistence/prisma-payments.repository.js';

@Module({
  // Approving a payment mints every member's badge.
  imports: [CredencialesModule],
  controllers: [PaymentsController, TopUpsController],
  providers: [
    ListPaymentsUseCase,
    GetPaymentUseCase,
    ApproveEnrollmentPaymentUseCase,
    ObserveEnrollmentPaymentUseCase,
    RejectEnrollmentPaymentUseCase,
    QuoteTopUpUseCase,
    RequestTopUpUseCase,
    ListOwnTopUpsUseCase,
    ListTopUpsUnderReviewUseCase,
    ApproveTopUpUseCase,
    RejectTopUpUseCase,
    ObserveTopUpUseCase,
    { provide: PAYMENTS_REPOSITORY, useClass: PrismaPaymentsRepository },
    { provide: PAYMENT_NOTIFIER_PORT, useClass: EmailPaymentNotifierAdapter },
    // The payment state, and the seats the package grants, are read here.
    { provide: ENROLLMENT_STATUS_PORT, useClass: AssistantEnrollmentStatusAdapter },
  ],
  exports: [ENROLLMENT_STATUS_PORT],
})
export class PagosModule {}
