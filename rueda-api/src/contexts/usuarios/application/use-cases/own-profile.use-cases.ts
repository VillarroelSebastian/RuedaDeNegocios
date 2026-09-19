import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import {
  TEMPORARY_PASSWORD_PORT,
  type TemporaryPasswordPort,
} from '../../../../shared/application/ports/temporary-password.port.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import {
  STAFF_REPOSITORY,
  type ProfileRecord,
  type StaffRepositoryPort,
} from '../../domain/ports/staff.repository.port.js';
import {
  type ProfilePatchInput,
  sanitizeProfilePatch,
} from '../../domain/services/staff-account.js';
import {
  STAFF_CREDENTIALS_NOTIFIER,
  type StaffCredentialsNotifierPort,
} from '../ports/staff-notifier.port.js';

const NOT_FOUND = 'Usuario no encontrado';

export interface UpdateProfileCommand extends ProfilePatchInput {
  /** Changing the address resets the password, so it is confirmed first. */
  confirmarResetCorreo?: boolean;
}

export interface UpdatedProfile extends ProfileRecord {
  /** True when the address changed and a new password went to it. */
  credencialesEnviadas: boolean;
}

@Injectable()
export class GetOwnProfileUseCase {
  constructor(@Inject(STAFF_REPOSITORY) private readonly staff: StaffRepositoryPort) {}

  async execute(userId: number): Promise<ProfileRecord> {
    const profile = await this.staff.findProfile(userId);
    if (!profile) throw new NotFoundError(NOT_FOUND);

    return profile;
  }
}

/**
 * The caller editing their own profile. Passwords are not changed here: that is
 * what `PATCH /auth/me/password` is for. The one exception is a change of
 * address, which resets the password and mails it to the new one — otherwise
 * somebody who typed the wrong address would lock themselves out silently.
 */
@Injectable()
export class UpdateOwnProfileUseCase {
  constructor(
    @Inject(STAFF_REPOSITORY) private readonly staff: StaffRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_PASSWORD_PORT) private readonly passwords: TemporaryPasswordPort,
    @Inject(STAFF_CREDENTIALS_NOTIFIER) private readonly notifier: StaffCredentialsNotifierPort,
  ) {}

  async execute(userId: number, command: UpdateProfileCommand): Promise<UpdatedProfile> {
    const current = await this.staff.findProfile(userId);
    if (!current) throw new NotFoundError(NOT_FOUND);

    const patch = sanitizeProfilePatch(command, current);

    if (patch.correoCambio) {
      const clash = await this.staff.findEmailClash(patch.correo, userId);
      if (clash) throw new ConflictError('Ya existe una cuenta con ese correo');
      if (command.confirmarResetCorreo !== true) {
        throw new ValidationError(
          'Confirma que deseas cambiar el correo y reiniciar la contraseña por seguridad.',
        );
      }
    }

    // The new password is minted before the write, but only sent afterwards:
    // sending it first would promise a password the save might never store.
    const temporaryPassword = patch.correoCambio ? this.passwords.generate() : null;

    const updated = await this.staff.updateProfile(userId, {
      nombres: patch.nombres,
      apellidoPaterno: patch.apellidoPaterno,
      apellidoMaterno: patch.apellidoMaterno,
      correo: patch.correo,
      telefono: patch.telefono,
      urlFotoPerfil: patch.urlFotoPerfil,
      ...(temporaryPassword ? { hashedPassword: await this.hasher.hash(temporaryPassword) } : {}),
    });

    if (temporaryPassword) {
      await this.notifier.sendProfileReset({
        correo: patch.correo,
        contraseniaTemporal: temporaryPassword,
      });
    }

    return { ...updated, credencialesEnviadas: Boolean(temporaryPassword) };
  }
}
