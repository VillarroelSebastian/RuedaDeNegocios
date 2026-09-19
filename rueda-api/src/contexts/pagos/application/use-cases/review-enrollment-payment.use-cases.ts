import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_NOTIFIER_PORT,
  type CompanyNotifierPort,
} from '../../../../shared/application/ports/company-notifier.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { clampLimit, clampPage } from '../../../../shared/domain/pagination.js';
import {
  PAYMENTS_REPOSITORY,
  type PaginatedPayments,
  type PaymentsRepositoryPort,
} from '../../domain/ports/payments.repository.port.js';
import {
  PAYMENT_NOTIFIER_PORT,
  type PaymentNotifierPort,
} from '../ports/payment-notifier.port.js';

export interface ListPaymentsQuery {
  estado?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 100;

@Injectable()
export class ListPaymentsUseCase {
  constructor(@Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort) {}

  execute(query: ListPaymentsQuery): Promise<PaginatedPayments> {
    return this.payments.list({
      estado: query.estado,
      page: clampPage(query.page),
      limit: clampLimit(query.limit, DEFAULT_LIMIT, MAX_LIMIT),
    });
  }
}

@Injectable()
export class GetPaymentUseCase {
  constructor(@Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort) {}

  async execute(companyEventId: number): Promise<unknown> {
    const enrollment = await this.payments.findEnrollment(companyEventId);
    if (!enrollment) throw new NotFoundError('El pago no existe.');
    return enrollment;
  }
}

/**
 * Sends the registration back for correction. Access is withdrawn and the
 * person in charge gets a link to upload a new receipt.
 */
@Injectable()
export class ObserveEnrollmentPaymentUseCase {
  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort,
    @Inject(PAYMENT_NOTIFIER_PORT) private readonly notifier: PaymentNotifierPort,
  ) {}

  async execute(companyEventId: number, observacion: string): Promise<void> {
    const text = observacion?.trim();
    if (!text) throw new ValidationError('La observación es obligatoria.');

    const contact = await this.payments.observeEnrollment(companyEventId, text);
    if (!contact) throw new NotFoundError('El pago no existe.');

    await this.notifier.sendObservation(contact, text);
  }
}

@Injectable()
export class RejectEnrollmentPaymentUseCase {
  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort,
    @Inject(PAYMENT_NOTIFIER_PORT) private readonly notifier: PaymentNotifierPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {}

  async execute(companyEventId: number, motivo: string): Promise<void> {
    const text = motivo?.trim();
    if (!text) throw new ValidationError('El motivo de rechazo es obligatorio.');

    const contact = await this.payments.rejectEnrollment(companyEventId, text);
    if (!contact) throw new NotFoundError('El pago no existe.');

    await this.notifier.sendRejection(contact, text);
    await this.companies.notify({
      companyEventId,
      tipo: 'pago:rechazado',
      titulo: 'Pago rechazado',
      mensaje: `Tu comprobante de pago fue rechazado. Motivo: ${text}`,
    });
  }
}
