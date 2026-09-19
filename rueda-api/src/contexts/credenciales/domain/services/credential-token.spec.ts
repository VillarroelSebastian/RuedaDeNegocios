import { describe, expect, it } from 'vitest';
import { credentialTokenFor, isValidCredentialToken } from './credential-token.js';

const SECRET = 'a-secret-long-enough-for-testing';

describe('credentialTokenFor', () => {
  it('produces a hex digest', () => {
    expect(credentialTokenFor(10, SECRET)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is stable for the same membership and secret', () => {
    expect(credentialTokenFor(10, SECRET)).toBe(credentialTokenFor(10, SECRET));
  });

  it('differs per membership, so one badge never opens another', () => {
    expect(credentialTokenFor(10, SECRET)).not.toBe(credentialTokenFor(11, SECRET));
  });

  it('differs per secret, so rotating it invalidates every badge', () => {
    expect(credentialTokenFor(10, SECRET)).not.toBe(credentialTokenFor(10, 'another-secret'));
  });
});

describe('isValidCredentialToken', () => {
  it('accepts the token it issued', () => {
    expect(isValidCredentialToken(10, credentialTokenFor(10, SECRET), SECRET)).toBe(true);
  });

  it('rejects the token of another membership', () => {
    expect(isValidCredentialToken(10, credentialTokenFor(11, SECRET), SECRET)).toBe(false);
  });

  it('rejects a tampered token', () => {
    const tampered = credentialTokenFor(10, SECRET).replace(/^./, '0');

    expect(isValidCredentialToken(10, tampered, SECRET)).toBe(false);
  });

  it('rejects an empty or missing token', () => {
    expect(isValidCredentialToken(10, '', SECRET)).toBe(false);
    expect(isValidCredentialToken(10, undefined, SECRET)).toBe(false);
  });

  it('rejects a token of the wrong length without throwing', () => {
    expect(isValidCredentialToken(10, 'abc', SECRET)).toBe(false);
  });
});
