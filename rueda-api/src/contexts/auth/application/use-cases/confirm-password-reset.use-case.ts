import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  USER_ACCOUNT_REPOSITORY,
  type ResetTokenCandidate,
  type UserAccountRepositoryPort,
} from '../../domain/ports/user-account.repository.port.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { Password } from '../../domain/value-objects/password.vo.js';

export interface ConfirmPasswordResetCommand {
  email: string;
  code: string;
  newPassword: string;
}

@Injectable()
export class ConfirmPasswordResetUseCase {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly users: UserAccountRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(command: ConfirmPasswordResetCommand): Promise<void> {
    const email = Email.create(command.email);
    const password = Password.create(command.newPassword);

    // Historical duplicates may share an email, so every candidate is checked.
    const candidates = await this.users.findResetCandidatesByEmail(email.value);
    const now = this.clock.now();

    const live = await this.findMatching(
      candidates.filter((candidate) => this.isLive(candidate, now)),
      command.code,
    );
    if (live) {
      await this.users.completePasswordReset(live.id, await this.hasher.hash(password.value));
      return;
    }

    const expired = await this.findMatching(candidates, command.code);
    if (expired) throw new ValidationError('El código ha expirado. Solicita uno nuevo.');

    throw new ValidationError('El código es incorrecto.');
  }

  private isLive(candidate: ResetTokenCandidate, now: Date): boolean {
    return candidate.expiresAt !== null && candidate.expiresAt > now;
  }

  private async findMatching(
    candidates: ResetTokenCandidate[],
    code: string,
  ): Promise<ResetTokenCandidate | undefined> {
    for (const candidate of candidates) {
      if (await this.hasher.verify(code, candidate.hashedCode)) return candidate;
    }
    return undefined;
  }
}
