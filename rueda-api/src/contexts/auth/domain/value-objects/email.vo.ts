import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** An account email, normalised the way the legacy login normalised it. */
export class Email {
  private constructor(readonly value: string) {}

  static create(candidate: unknown): Email {
    if (typeof candidate !== 'string') {
      throw new ValidationError('El correo electrónico no es válido.');
    }

    const normalised = candidate.trim().toLowerCase();
    if (!SHAPE.test(normalised)) {
      throw new ValidationError('El correo electrónico no es válido.');
    }

    return new Email(normalised);
  }
}
