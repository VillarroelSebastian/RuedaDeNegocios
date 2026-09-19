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
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  STAFF_REPOSITORY,
  type StaffRepositoryPort,
  type TechnicianRecord,
} from '../../domain/ports/staff.repository.port.js';
import {
  sanitizeTechnicianAccount,
  type TechnicianAccountInput,
} from '../../domain/services/staff-account.js';
import {
  STAFF_CREDENTIALS_NOTIFIER,
  type StaffCredentialsNotifierPort,
} from '../ports/staff-notifier.port.js';

const EMAIL_CLASH = {
  OTRO_ROL: 'El correo pertenece a un usuario registrado y no puede utilizarse para un técnico.',
  TECNICO_ACTIVO: 'Ya existe un técnico activo con ese correo.',
} as const;

const PHONE_TAKEN = 'Ya existe un usuario con ese telefono';
const NOT_FOUND = 'Técnico activo no encontrado.';

export interface CreatedTechnician extends TechnicianRecord {
  correoEnviado: boolean;
  /** True when a technician removed earlier was brought back. */
  reactivado: boolean;
}

@Injectable()
abstract class TechnicianUseCase {
  constructor(@Inject(STAFF_REPOSITORY) protected readonly staff: StaffRepositoryPort) {}

  /** An address belongs to one person, whatever role they hold. */
  protected async assertContactIsFree(
    correo: string,
    telefonoDigits: string,
    exceptUserId: number | null,
  ): Promise<void> {
    const clash = await this.staff.findEmailClash(correo, exceptUserId);
    if (clash) throw new ConflictError(EMAIL_CLASH[clash]);

    if (await this.staff.isPhoneTaken(telefonoDigits, exceptUserId)) {
      throw new ConflictError(PHONE_TAKEN);
    }
  }
}

@Injectable()
export class ListTechniciansUseCase extends TechnicianUseCase {
  execute(): Promise<TechnicianRecord[]> {
    return this.staff.listTechnicians();
  }
}

/**
 * Registers a technician and mails them the password they log in with. A
 * technician who was removed earlier is brought back rather than duplicated, so
 * their history stays attached to one account.
 */
@Injectable()
export class CreateTechnicianUseCase extends TechnicianUseCase {
  constructor(
    @Inject(STAFF_REPOSITORY) staff: StaffRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_PASSWORD_PORT) private readonly passwords: TemporaryPasswordPort,
    @Inject(STAFF_CREDENTIALS_NOTIFIER) private readonly notifier: StaffCredentialsNotifierPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {
    super(staff);
  }

  async execute(input: TechnicianAccountInput): Promise<CreatedTechnician> {
    const account = sanitizeTechnicianAccount(input);
    await this.assertContactIsFree(account.correo, account.telefonoDigits, null);

    const temporaryPassword = this.passwords.generate();
    const hashed = await this.hasher.hash(temporaryPassword);

    const deactivated = await this.staff.findDeactivatedTechnician(account.correo);
    const technician = deactivated
      ? await this.staff.reactivateTechnician(deactivated.id, account, hashed)
      : await this.staff.createTechnician(account, hashed);

    const event = await this.staff.findPrincipalEvent();
    let correoEnviado = true;
    let error: string | null = null;

    try {
      await this.notifier.sendTechnicianCredentials({
        correo: account.correo,
        nombres: account.nombres,
        apellidoPaterno: account.apellidoPaterno,
        contraseniaTemporal: temporaryPassword,
        eventoNombre: event?.nombre ?? null,
        eventoEdicion: event?.edicion ?? null,
      });
    } catch (failure) {
      correoEnviado = false;
      error = failure instanceof Error ? failure.message : 'No se pudo enviar el correo';
    }

    await this.staff.recordCredentialDelivery(technician.id, {
      ultimoEnvioCredenciales: this.clock.now(),
      estadoUltimoEnvioCredenciales: correoEnviado ? 'ENVIADO' : 'FALLIDO',
      errorUltimoEnvioCredenciales: error,
    });

    return { ...technician, correoEnviado, reactivado: Boolean(deactivated) };
  }
}

@Injectable()
export class UpdateTechnicianUseCase extends TechnicianUseCase {
  async execute(
    technicianId: number,
    input: TechnicianAccountInput,
  ): Promise<TechnicianRecord> {
    const existing = await this.staff.findTechnician(technicianId);
    if (!existing) throw new NotFoundError(NOT_FOUND);

    const account = sanitizeTechnicianAccount(input);
    await this.assertContactIsFree(account.correo, account.telefonoDigits, technicianId);

    return this.staff.updateTechnician(technicianId, account);
  }
}

@Injectable()
export class DeleteTechnicianUseCase extends TechnicianUseCase {
  async execute(technicianId: number): Promise<void> {
    const existing = await this.staff.findTechnician(technicianId);
    if (!existing) throw new NotFoundError(NOT_FOUND);

    await this.staff.deactivateTechnician(technicianId);
  }
}

/**
 * Mints a new password and mails it. If the email does not go out the previous
 * password is put back: a technician locked out by a mail server that happened
 * to be down is worse than one whose password was never rotated.
 */
@Injectable()
export class ResendTechnicianCredentialsUseCase extends TechnicianUseCase {
  constructor(
    @Inject(STAFF_REPOSITORY) staff: StaffRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_PASSWORD_PORT) private readonly passwords: TemporaryPasswordPort,
    @Inject(STAFF_CREDENTIALS_NOTIFIER) private readonly notifier: StaffCredentialsNotifierPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {
    super(staff);
  }

  async execute(technicianId: number): Promise<void> {
    const technician = await this.staff.findTechnician(technicianId);
    if (!technician) throw new NotFoundError(NOT_FOUND);

    const previous = await this.staff.currentPasswordOf(technicianId);
    const temporaryPassword = this.passwords.generate();
    await this.staff.setPassword(technicianId, await this.hasher.hash(temporaryPassword));

    const event = await this.staff.findPrincipalEvent();

    try {
      await this.notifier.sendTechnicianCredentials({
        correo: technician.correo,
        nombres: technician.nombres,
        apellidoPaterno: technician.apellidoPaterno,
        contraseniaTemporal: temporaryPassword,
        eventoNombre: event?.nombre ?? null,
        eventoEdicion: event?.edicion ?? null,
      });
    } catch (failure) {
      if (previous) await this.staff.setPassword(technicianId, previous);
      await this.staff.recordCredentialDelivery(technicianId, {
        ultimoEnvioCredenciales: this.clock.now(),
        estadoUltimoEnvioCredenciales: 'FALLIDO',
        errorUltimoEnvioCredenciales:
          failure instanceof Error ? failure.message : 'No se pudo enviar el correo',
      });

      throw new ConflictError(
        'No se pudo enviar el correo. La contraseña anterior continúa vigente.',
      );
    }

    await this.staff.recordCredentialDelivery(technicianId, {
      ultimoEnvioCredenciales: this.clock.now(),
      estadoUltimoEnvioCredenciales: 'ENVIADO',
      errorUltimoEnvioCredenciales: null,
    });
  }
}
