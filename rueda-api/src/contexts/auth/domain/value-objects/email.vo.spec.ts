import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { Email } from './email.vo.js';

describe('Email', () => {
  it('normalises to trimmed lowercase, the form stored by the legacy login', () => {
    expect(Email.create('  Empresa@Test.COM  ').value).toBe('empresa@test.com');
  });

  it('accepts a plain address', () => {
    expect(Email.create('user@test.com').value).toBe('user@test.com');
  });

  it.each([['empty', ''], ['blank', '   '], ['no at sign', 'user.test.com'], ['no domain', 'user@'], ['no user', '@test.com'], ['with a space', 'us er@test.com']])(
    'rejects an address that is %s',
    (_case, candidate) => {
      expect(() => Email.create(candidate)).toThrow(ValidationError);
    },
  );

  it('rejects non-string input', () => {
    expect(() => Email.create(undefined)).toThrow(ValidationError);
  });
});
