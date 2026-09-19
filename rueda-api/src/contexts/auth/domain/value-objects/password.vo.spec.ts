import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { Password } from './password.vo.js';

const VALID = 'Rueda2026!segura';

describe('Password', () => {
  it('accepts a password with length, upper, lower, digit and symbol', () => {
    expect(Password.create(VALID).value).toBe(VALID);
  });

  it.each([
    ['shorter than 12 characters', 'Abc1!def'],
    ['without an uppercase letter', 'rueda2026!segura'],
    ['without a lowercase letter', 'RUEDA2026!SEGURA'],
    ['without a digit', 'RuedaSegura!xyz'],
    ['without a symbol', 'Rueda2026segura'],
  ])('rejects a password %s', (_case, candidate) => {
    expect(() => Password.create(candidate)).toThrow(ValidationError);
  });

  it('states the full policy in the error message', () => {
    expect(() => Password.create('corta')).toThrow(
      /12 caracteres, mayúscula, minúscula, número y símbolo/,
    );
  });

  it('rejects non-string input', () => {
    expect(() => Password.create(undefined)).toThrow(ValidationError);
    expect(() => Password.create(null)).toThrow(ValidationError);
  });

  it('never trims, because spaces are valid password characters', () => {
    const withSpace = 'Rueda 2026 !x';
    expect(Password.create(withSpace).value).toBe(withSpace);
  });
});
