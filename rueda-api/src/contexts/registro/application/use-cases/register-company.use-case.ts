import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import {
  TEMPORARY_PASSWORD_PORT,
  type TemporaryPasswordPort,
} from '../../../../shared/application/ports/temporary-password.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { STAFF_ROLES } from '../../../../shared/domain/role.js';
import { trackingTokenFor } from '../../../pagos/domain/services/tracking-token.js';
import {
  type KnownAccount,
  REGISTRATION_REPOSITORY,
  type RegisteredParticipant,
  type RegistrationRepositoryPort,
  type ParticipantToCreate,
} from '../../domain/ports/registration.repository.port.js';
import {
  type CompanyApplicationInput,
  sanitizeCompanyApplication,
} from '../../domain/services/company-application.js';
import { priceEnrollment } from '../../domain/services/enrollment-pricing.js';
import {
  type ParticipantApplicationInput,
  sanitizeParticipantApplications,
} from '../../domain/services/participant-application.js';
import { assertRegistrationOpen } from '../../domain/services/registration-window.js';
import {
  REGISTRATION_NOTIFIER,
  type RegistrationNotifierPort,
} from '../ports/registration-notifier.port.js';

export interface RegisterCompanyCommand {
  empresa: CompanyApplicationInput;
  paqueteId: number;
  urlComprobante?: string | null;
  participantes: ParticipantApplicationInput[];
}

export interface RegistrationReceipt {
  empresaeventoId: number;
  /** Signs the link the company follows its registration through. */
  seguimientoToken: string;
  empresa: { id: number; nombre: string; codigo: string };
  inscripcion: {
    id: number;
    numeroParticipantes: number;
    montoPagado: number;
    estadoVerificacionPago: string;
    tipoParticipacion: string;
  };
  participantes: RegisteredParticipant[];
}

const BRAND_GREEN = '449D3A';

/**
 * The public front door: a company registers itself, its people and its payment
 * receipt in one submission, without an account. Everything that can refuse is
 * evaluated before anything is written, so a duplicate never leaves half an
 * enrollment behind.
 */
@Injectable()
export class RegisterCompanyUseCase {
  constructor(
    @Inject(REGISTRATION_REPOSITORY) private readonly registrations: RegistrationRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_PASSWORD_PORT) private readonly passwords: TemporaryPasswordPort,
    @Inject(REGISTRATION_NOTIFIER) private readonly notifier: RegistrationNotifierPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async execute(command: RegisterCompanyCommand): Promise<RegistrationReceipt> {
    const event = await this.registrations.findPrincipalEvent();
    if (!event) throw new ValidationError('No hay evento activo en este momento.');

    assertRegistrationOpen(
      { opensAt: event.fechaInicioSolicitudes, closesAt: event.fechaFinSolicitudes },
      this.clock.now(),
    );

    const empresa = sanitizeCompanyApplication(command.empresa);
    const roster = sanitizeParticipantApplications(command.participantes);

    const registrationPackage = await this.registrations.findPackage(event.id, command.paqueteId);
    if (!registrationPackage) {
      throw new NotFoundError('El paquete seleccionado no está disponible.');
    }
    const priced = priceEnrollment(registrationPackage, roster.length);

    const company = await this.registrations.findCompanyByEmail(
      event.id,
      empresa.correoCorporativo,
    );
    if (company?.enrolledInEvent) {
      throw new ConflictError('Esta empresa ya está registrada para el evento actual.');
    }

    const phoneOwner = await this.registrations.findCompanyByPhone(
      event.id,
      empresa.telefonoDigits,
      company?.id ?? null,
    );
    if (phoneOwner) {
      throw new ConflictError(
        `El telefono/WhatsApp ya esta registrado por la empresa "${phoneOwner.nombre}".`,
      );
    }

    const accounts = await this.assertAccountsAvailable(
      event.id,
      roster.map((participant) => participant.correo),
    );
    await this.assertPhonesAvailable(event.id, roster, accounts);

    const participantes: ParticipantToCreate[] = [];
    for (const participant of roster) {
      const existing = accounts.get(participant.correo) ?? null;
      // Someone who already has an account keeps their password; a brand new
      // one gets a random throwaway it is never told, because the credentials
      // it will actually use are minted and emailed when the payment is approved.
      const password = existing ? null : await this.hasher.hash(this.passwords.generate());

      participantes.push({
        ...participant,
        existingUserId: existing?.id ?? null,
        hashedPassword: password,
        urlFotoPerfil: avatarUrlFor(participant.nombres, participant.apellidoPaterno),
      });
    }

    const registered = await this.registrations.register({
      eventId: event.id,
      existingCompanyId: company?.id ?? null,
      empresa,
      priced,
      urlComprobante: command.urlComprobante?.trim() || null,
      participantes,
    });

    const inCharge = registered.participantes.find((participant) => participant.esResponsable);
    if (inCharge) {
      await this.notifier.sendSubmissionReceipt({
        companyEventId: registered.companyEventId,
        correo: inCharge.correo,
        nombres: inCharge.nombres,
        apellidoPaterno: inCharge.apellidoPaterno,
        companyName: registered.companyName,
        eventName: event.nombre,
        numeroParticipantes: registered.numeroParticipantes,
        montoPagado: registered.montoPagado,
      });
    }

    return {
      empresaeventoId: registered.companyEventId,
      seguimientoToken: trackingTokenFor(registered.companyEventId, this.env.JWT_SECRET),
      empresa: {
        id: registered.companyId,
        nombre: registered.companyName,
        codigo: registered.companyCode,
      },
      inscripcion: {
        id: registered.companyEventId,
        numeroParticipantes: registered.numeroParticipantes,
        montoPagado: registered.montoPagado,
        estadoVerificacionPago: registered.estadoVerificacionPago,
        tipoParticipacion: registered.tipoParticipacion,
      },
      participantes: registered.participantes,
    };
  }

  /** Accounts that may be reused, once the ones that may not are refused. */
  private async assertAccountsAvailable(
    eventId: number,
    emails: string[],
  ): Promise<Map<string, KnownAccount>> {
    const accounts = await this.registrations.findAccountsByEmail(emails, eventId);
    const byEmail = new Map<string, KnownAccount>();

    for (const account of accounts) {
      if (STAFF_ROLES.includes(account.rolEvento as never)) {
        throw new ConflictError(
          `El correo ${account.correo} pertenece a una cuenta interna y no puede registrarse como participante.`,
        );
      }
      if (account.enrolledInEvent) {
        throw new ConflictError(
          `El correo ${account.correo} ya esta registrado en el evento actual.`,
        );
      }
      byEmail.set(account.correo, account);
    }

    return byEmail;
  }

  private async assertPhonesAvailable(
    eventId: number,
    roster: { correo: string; telefonoDigits: string }[],
    accounts: Map<string, KnownAccount>,
  ): Promise<void> {
    const taken = await this.registrations.listParticipantPhones(eventId);

    for (const participant of roster) {
      const reused = accounts.get(participant.correo);
      const clash = taken.some(
        (phone) =>
          phone.telefonoDigits === participant.telefonoDigits && phone.userId !== reused?.id,
      );
      if (clash) {
        throw new ConflictError(
          `El telefono del participante con correo ${participant.correo} ya esta asociado a otra cuenta.`,
        );
      }
    }
  }
}

function avatarUrlFor(nombres: string, apellidoPaterno: string): string {
  const name = `${encodeURIComponent(nombres)}+${encodeURIComponent(apellidoPaterno)}`;
  return `https://ui-avatars.com/api/?name=${name}&background=${BRAND_GREEN}&color=fff&size=128`;
}
