import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_NOTIFIER_PORT,
  type CompanyNotifierPort,
} from '../../../../shared/application/ports/company-notifier.port.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { maxParticipantsOf } from '../../../participantes/domain/services/participant-capacity.js';
import {
  PAYMENTS_REPOSITORY,
  type PaymentsRepositoryPort,
  type TopUpQuote,
  type TopUpRequest,
  type TopUpUnderReview,
} from '../../domain/ports/payments.repository.port.js';

/** Quotes what buying extra participant slots would cost, and which QR to pay it with. */
@Injectable()
export class QuoteTopUpUseCase {
  constructor(@Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort) {}

  async execute(companyEventId: number, extraSlots: number): Promise<TopUpQuote> {
    const quote = await this.payments.quoteTopUp(companyEventId, Math.max(1, extraSlots));
    if (!quote) throw new NotFoundError('La inscripción no existe.');
    return quote;
  }
}

export interface RequestTopUpCommand {
  companyEventId: number;
  userId: number;
  cantidadParticipantes: number;
  urlComprobante: string;
}

@Injectable()
export class RequestTopUpUseCase {
  constructor(@Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort) {}

  async execute(command: RequestTopUpCommand): Promise<{ comprobanteId: number; montoPago: number }> {
    if (command.cantidadParticipantes < 1) {
      throw new ValidationError('Debes solicitar al menos un cupo adicional.');
    }
    if (!command.urlComprobante?.trim()) {
      throw new ValidationError('El comprobante es obligatorio.');
    }

    if (!(await this.payments.isResponsible(command.companyEventId, command.userId))) {
      throw new ForbiddenError('Solo el encargado puede solicitar cupos adicionales.');
    }

    const capacity = await this.payments.findCapacity(command.companyEventId);
    if (!capacity) throw new NotFoundError('La inscripción no existe.');

    // The ceiling is checked on the requested total, not on what is used today.
    const ceiling = maxParticipantsOf(capacity);
    const wouldBe = capacity.paidSlots + command.cantidadParticipantes;
    if (wouldBe > ceiling) {
      throw new ConflictError(
        `No puedes solicitar ${command.cantidadParticipantes} cupos adicionales porque superarías el máximo permitido de ${ceiling} participantes por empresa.`,
      );
    }

    const quote = await this.payments.quoteTopUp(
      command.companyEventId,
      command.cantidadParticipantes,
    );

    const created = await this.payments.createTopUp({
      companyEventId: command.companyEventId,
      extraSlots: command.cantidadParticipantes,
      amount: quote?.monto ?? 0,
      receiptUrl: command.urlComprobante.trim(),
    });

    return { comprobanteId: created.id, montoPago: created.montoPago };
  }
}

@Injectable()
export class ListOwnTopUpsUseCase {
  constructor(@Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort) {}

  execute(companyEventId: number): Promise<TopUpRequest[]> {
    return this.payments.listTopUpsOf(companyEventId);
  }
}

@Injectable()
export class ListTopUpsUnderReviewUseCase {
  constructor(@Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort) {}

  execute(estado?: string): Promise<TopUpUnderReview[]> {
    return this.payments.listTopUpsUnderReview(estado);
  }
}

@Injectable()
export class ApproveTopUpUseCase {
  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {}

  async execute(topUpId: number): Promise<{ nuevoTotalSlots: number }> {
    const topUp = await this.payments.findPendingTopUp(topUpId);
    if (!topUp) throw new NotFoundError('El pago adicional no existe o ya fue procesado.');

    const capacity = await this.payments.findCapacity(topUp.companyEventId);
    if (!capacity) throw new NotFoundError('La inscripción no existe.');

    const ceiling = maxParticipantsOf(capacity);
    const newTotal = capacity.paidSlots + topUp.extraSlots;
    // Re-checked at approval time: the package may have changed since the request.
    if (newTotal > ceiling) {
      throw new ConflictError(
        `Aprobar este pago superaría el máximo de ${ceiling} participantes por empresa.`,
      );
    }

    await this.payments.approveTopUp(topUp.id, topUp.companyEventId, newTotal);
    await this.companies.notify({
      companyEventId: topUp.companyEventId,
      tipo: 'pago-adicional:aprobado',
      titulo: 'Pago adicional aprobado',
      mensaje: `Tu pago adicional fue aprobado. Ahora tienes ${newTotal} cupos totales.`,
    });

    return { nuevoTotalSlots: newTotal };
  }
}

@Injectable()
export class RejectTopUpUseCase {
  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {}

  async execute(topUpId: number, motivo?: string): Promise<void> {
    const topUp = await this.payments.findTopUp(topUpId);
    if (!topUp) throw new NotFoundError('El pago adicional no existe.');

    const reason = motivo?.trim() || null;
    await this.payments.setTopUpStatus(topUp.id, 'RECHAZADO', reason);
    await this.companies.notify({
      companyEventId: topUp.companyEventId,
      tipo: 'pago-adicional:rechazado',
      titulo: 'Pago adicional rechazado',
      mensaje: `Tu pago adicional fue rechazado.${reason ? ` Motivo: ${reason}` : ''}`,
    });
  }
}

@Injectable()
export class ObserveTopUpUseCase {
  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly payments: PaymentsRepositoryPort,
    @Inject(COMPANY_NOTIFIER_PORT) private readonly companies: CompanyNotifierPort,
  ) {}

  async execute(topUpId: number, observacion: string): Promise<void> {
    const text = observacion?.trim();
    if (!text) throw new ValidationError('La observación es obligatoria.');

    const topUp = await this.payments.findTopUp(topUpId);
    if (!topUp) throw new NotFoundError('El pago adicional no existe.');

    await this.payments.setTopUpStatus(topUp.id, 'OBSERVADO', text);
    // The legacy endpoint stayed silent here; the company now learns about it.
    await this.companies.notify({
      companyEventId: topUp.companyEventId,
      tipo: 'pago-adicional:observado',
      titulo: 'Pago adicional con observaciones',
      mensaje: `Tu pago adicional tiene observaciones: ${text}`,
    });
  }
}
