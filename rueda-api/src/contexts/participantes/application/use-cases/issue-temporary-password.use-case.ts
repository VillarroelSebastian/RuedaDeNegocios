import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import {
  TEMPORARY_PASSWORD_PORT,
  type TemporaryPasswordPort,
} from '../../../../shared/application/ports/temporary-password.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import { Password } from '../../../auth/domain/value-objects/password.vo.js';
import {
  PARTICIPANTS_REPOSITORY,
  type ParticipantsRepositoryPort,
} from '../../domain/ports/participants.repository.port.js';

export interface IssueTemporaryPasswordCommand {
  userId: number;
  /** Optional: an administrator may dictate the password instead. */
  nuevaContrasenia?: string;
}

export interface IssuedPassword {
  correo: string;
  /**
   * Returned once, in this response only. Stored passwords are hashed and can
   * never be read back, so this is the single chance to hand it over.
   */
  nuevaContrasenia: string;
}

@Injectable()
export class IssueTemporaryPasswordUseCase {
  constructor(
    @Inject(PARTICIPANTS_REPOSITORY) private readonly participants: ParticipantsRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_PASSWORD_PORT) private readonly passwords: TemporaryPasswordPort,
  ) {}

  async execute(command: IssueTemporaryPasswordCommand): Promise<IssuedPassword> {
    const account = await this.participants.findActiveParticipantAccount(command.userId);
    if (!account) throw new NotFoundError('No se encontró un participante activo con esa cuenta.');

    const chosen = command.nuevaContrasenia?.trim();
    // A dictated password must clear the same policy as any other.
    const password = chosen
      ? Password.create(chosen).value
      : this.passwords.generatePolicyCompliant();

    await this.participants.setPassword(account.id, await this.hasher.hash(password));

    return { correo: account.correo, nuevaContrasenia: password };
  }
}
