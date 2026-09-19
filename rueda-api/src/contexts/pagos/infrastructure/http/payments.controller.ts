import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ROLES } from '../../../../shared/domain/role.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  type ApprovalResult,
  ApproveEnrollmentPaymentUseCase,
} from '../../application/use-cases/approve-enrollment-payment.use-case.js';
import {
  GetPaymentUseCase,
  ListPaymentsUseCase,
  ObserveEnrollmentPaymentUseCase,
  RejectEnrollmentPaymentUseCase,
} from '../../application/use-cases/review-enrollment-payment.use-cases.js';
import type { PaginatedPayments } from '../../domain/ports/payments.repository.port.js';
import { ListPaymentsQueryDto, ObservationDto, RejectionDto } from './dto/payment.dto.js';

const STAFF = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

/**
 * Review of registration payments. `GET /admin/pagos/pendientes` is gone:
 * it was `GET /payments?estado=PENDIENTE` with a different sort order, and the
 * list now always leads with the most recently submitted receipt.
 */
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly listPayments: ListPaymentsUseCase,
    private readonly getPayment: GetPaymentUseCase,
    private readonly approve: ApproveEnrollmentPaymentUseCase,
    private readonly observe: ObserveEnrollmentPaymentUseCase,
    private readonly reject: RejectEnrollmentPaymentUseCase,
  ) {}

  @Roles(...STAFF)
  @Get()
  list(@Query() query: ListPaymentsQueryDto): Promise<PaginatedPayments> {
    return this.listPayments.execute(query);
  }

  @Roles(...STAFF)
  @Get(':companyEventId')
  detail(@Param('companyEventId', ParseIntPipe) companyEventId: number): Promise<unknown> {
    return this.getPayment.execute(companyEventId);
  }

  /** Admits the company: enables access and sends everyone their credentials. */
  @Roles(ROLES.ADMIN)
  @Post(':companyEventId/approval')
  approvePayment(
    @Param('companyEventId', ParseIntPipe) companyEventId: number,
  ): Promise<ApprovalResult> {
    return this.approve.execute(companyEventId);
  }

  @Roles(ROLES.ADMIN)
  @Post(':companyEventId/observation')
  @HttpCode(HttpStatus.NO_CONTENT)
  observePayment(
    @Param('companyEventId', ParseIntPipe) companyEventId: number,
    @Body() dto: ObservationDto,
  ): Promise<void> {
    return this.observe.execute(companyEventId, dto.observacion);
  }

  @Roles(ROLES.ADMIN)
  @Post(':companyEventId/rejection')
  @HttpCode(HttpStatus.NO_CONTENT)
  rejectPayment(
    @Param('companyEventId', ParseIntPipe) companyEventId: number,
    @Body() dto: RejectionDto,
  ): Promise<void> {
    return this.reject.execute(companyEventId, dto.motivo);
  }
}
