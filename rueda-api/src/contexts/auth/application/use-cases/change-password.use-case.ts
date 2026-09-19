import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  USER_ACCOUNT_REPOSITORY,
  type UserAccountRepositoryPort,
} from '../../domain/ports/user-account.repository.port.js';
import { Password } from '../../domain/value-objects/password.vo.js';

export interface ChangePasswordCommand {
  /** Taken from the access token, never from the request body. */
  userId: number;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly users: UserAccountRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const next = Password.create(command.newPassword);

    const account = await this.users.findActiveById(command.userId);
    if (!account) throw new NotFoundError('La cuenta no existe.');

    const matches = account.hasLegacyPlaintextPassword()
      ? account.storedPassword === command.currentPassword
      : await this.hasher.verify(command.currentPassword, account.storedPassword);
    if (!matches) throw new ValidationError('La contraseña actual es incorrecta.');

    await this.users.updatePassword(account.id, await this.hasher.hash(next.value));
  }
}
