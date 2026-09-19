import { Inject, Injectable } from '@nestjs/common';
import { normalizeEmail, normalizePhone } from '../../../../shared/domain/contact.js';
import {
  REGISTRATION_REPOSITORY,
  type RegistrationRepositoryPort,
} from '../../domain/ports/registration.repository.port.js';

export interface AvailabilityQuery {
  correo?: string;
  telefono?: string;
  /** `empresa` asks about a corporate number; anything else about a person. */
  tipo?: string;
}

export interface AvailabilityResult {
  existe: boolean;
  nombreEmpresa?: string;
}

const MIN_PHONE_DIGITS = 7;

/** A fresh object every time: the answer travels straight out as the response. */
const nothingTaken = (): AvailabilityResult => ({ existe: false });

/**
 * Tells the registration form, while it is being filled in, whether a company
 * or a person is already part of the event. It answers about the current event
 * only, and never reveals anything beyond the name of an enrolled company.
 */
@Injectable()
export class CheckAvailabilityUseCase {
  constructor(
    @Inject(REGISTRATION_REPOSITORY) private readonly registrations: RegistrationRepositoryPort,
  ) {}

  async execute(query: AvailabilityQuery): Promise<AvailabilityResult> {
    const event = await this.registrations.findPrincipalEvent();
    if (!event) return nothingTaken();

    const telefonoDigits = normalizePhone(query.telefono);
    if (telefonoDigits.length > 0) {
      // Half a number matches far too much to answer honestly.
      if (telefonoDigits.length < MIN_PHONE_DIGITS) return nothingTaken();

      if (query.tipo === 'empresa') {
        const company = await this.registrations.findCompanyByPhone(event.id, telefonoDigits, null);
        return company ? { existe: true, nombreEmpresa: company.nombre } : nothingTaken();
      }

      // The number of the very person filling the form in is not a clash.
      const taken = await this.registrations.isParticipantPhoneTaken(
        event.id,
        telefonoDigits,
        normalizeEmail(query.correo),
      );
      return { existe: taken };
    }

    const correo = normalizeEmail(query.correo);
    if (!correo) return nothingTaken();

    const company = await this.registrations.findCompanyByEmail(event.id, correo);
    return company?.enrolledInEvent
      ? { existe: true, nombreEmpresa: company.nombre }
      : nothingTaken();
  }
}
