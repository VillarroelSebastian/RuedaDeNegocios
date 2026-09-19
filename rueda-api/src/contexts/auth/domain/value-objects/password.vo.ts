import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

const MIN_LENGTH = 12;
const POLICY_MESSAGE =
  'La contraseña debe tener al menos 12 caracteres, mayúscula, minúscula, número y símbolo.';

/** A plaintext password that already satisfies the account policy. */
export class Password {
  private constructor(readonly value: string) {}

  static create(candidate: unknown): Password {
    if (typeof candidate !== 'string') throw new ValidationError(POLICY_MESSAGE);

    const satisfiesPolicy =
      candidate.length >= MIN_LENGTH &&
      /[A-Z]/.test(candidate) &&
      /[a-z]/.test(candidate) &&
      /\d/.test(candidate) &&
      /[^A-Za-z0-9]/.test(candidate);

    if (!satisfiesPolicy) throw new ValidationError(POLICY_MESSAGE);
    return new Password(candidate);
  }
}
