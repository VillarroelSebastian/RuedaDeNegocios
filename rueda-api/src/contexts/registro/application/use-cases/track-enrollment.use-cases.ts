import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { isValidTrackingToken } from '../../../pagos/domain/services/tracking-token.js';
import {
  REGISTRATION_REPOSITORY,
  type RegistrationRepositoryPort,
  type TrackedEnrollment,
} from '../../domain/ports/registration.repository.port.js';

/** Payment states a receipt may no longer be replaced in. */
const SETTLED = ['COMPLETADO', 'RECHAZADO'];

function assertLinkIsGenuine(companyEventId: number, token: string, secret: string): void {
  if (!isValidTrackingToken(companyEventId, token, secret)) {
    throw new UnauthorizedError('Enlace de seguimiento inválido.');
  }
}

/**
 * The signed link is the only credential here: a company follows its pending
 * registration before it has any account at all.
 */
@Injectable()
export class GetEnrollmentTrackingUseCase {
  constructor(
    @Inject(REGISTRATION_REPOSITORY) private readonly registrations: RegistrationRepositoryPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async execute(companyEventId: number, token: string): Promise<TrackedEnrollment> {
    assertLinkIsGenuine(companyEventId, token, this.env.JWT_SECRET);

    const tracked = await this.registrations.findTracking(companyEventId);
    if (!tracked) throw new NotFoundError('Registro no encontrado');

    return tracked;
  }
}

/** Lets a company answer an observed receipt without waiting for an account. */
@Injectable()
export class ResubmitReceiptUseCase {
  constructor(
    @Inject(REGISTRATION_REPOSITORY) private readonly registrations: RegistrationRepositoryPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async execute(companyEventId: number, token: string, urlComprobante: string): Promise<void> {
    assertLinkIsGenuine(companyEventId, token, this.env.JWT_SECRET);

    const receipt = urlComprobante.trim();
    if (!receipt) throw new ValidationError('El comprobante es obligatorio.');

    const target = await this.registrations.findReceiptTarget(companyEventId);
    if (!target) throw new NotFoundError('Registro no encontrado');

    // An approved or rejected payment has already been decided; reopening it
    // from a public link would undo a decision staff made.
    if (SETTLED.includes(target.estadoVerificacionPago)) {
      throw new ConflictError('No se puede modificar el comprobante en el estado actual');
    }

    await this.registrations.replaceReceipt(companyEventId, receipt);
  }
}
