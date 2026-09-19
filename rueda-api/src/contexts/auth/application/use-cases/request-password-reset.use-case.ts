import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import {
  USER_ACCOUNT_REPOSITORY,
  type UserAccountRepositoryPort,
} from '../../domain/ports/user-account.repository.port.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import {
  PASSWORD_RESET_NOTIFIER,
  type PasswordResetNotifierPort,
} from '../ports/password-reset-notifier.port.js';
import {
  VERIFICATION_CODE_GENERATOR,
  type VerificationCodeGeneratorPort,
} from '../ports/verification-code.port.js';

export interface RequestPasswordResetCommand {
  email: string;
}

const CODE_LIFETIME_MS = 15 * 60 * 1000;

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly users: UserAccountRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(VERIFICATION_CODE_GENERATOR) private readonly codes: VerificationCodeGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(PASSWORD_RESET_NOTIFIER) private readonly notifier: PasswordResetNotifierPort,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const email = Email.create(command.email);

    const recipient = await this.users.findLatestActiveRecipientByEmail(email.value);
    // Unknown accounts resolve silently: answering differently would turn this
    // endpoint into an email enumeration oracle.
    if (!recipient) return;

    const code = this.codes.generate();
    const expiresAt = new Date(this.clock.now().getTime() + CODE_LIFETIME_MS);

    await this.users.saveResetToken(recipient.id, await this.hasher.hash(code), expiresAt);
    await this.notifier.sendResetCode(
      { email: recipient.email, nombres: recipient.nombres },
      code,
    );
  }
}
