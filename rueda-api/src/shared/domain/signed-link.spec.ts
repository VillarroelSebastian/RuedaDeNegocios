import { describe, expect, it } from 'vitest';
import { isValidSignedLink, signLink } from './signed-link.js';

const SECRET = 'a-very-long-development-secret-value';

describe('signLink', () => {
  it('signs a subject the same way every time', () => {
    expect(signLink('credencial-5', SECRET)).toBe(signLink('credencial-5', SECRET));
  });

  it('signs different subjects differently', () => {
    expect(signLink('credencial-5', SECRET)).not.toBe(signLink('credencial-6', SECRET));
  });

  /** Two links of different kinds for the same id must not be interchangeable. */
  it('keeps one kind of link out of another', () => {
    expect(signLink('credencial-5', SECRET)).not.toBe(signLink('auspiciador-5', SECRET));
  });

  it('signs differently under another secret', () => {
    expect(signLink('credencial-5', SECRET)).not.toBe(signLink('credencial-5', 'other'));
  });
});

describe('isValidSignedLink', () => {
  const token = signLink('credencial-5', SECRET);

  it('accepts the token it produced', () => {
    expect(isValidSignedLink('credencial-5', token, SECRET)).toBe(true);
  });

  it('refuses the token of another subject', () => {
    expect(isValidSignedLink('credencial-6', token, SECRET)).toBe(false);
  });

  it('refuses a token that is missing', () => {
    expect(isValidSignedLink('credencial-5', undefined, SECRET)).toBe(false);
    expect(isValidSignedLink('credencial-5', '', SECRET)).toBe(false);
  });

  /** Comparing buffers of different lengths throws, so length is checked first. */
  it('refuses a token of the wrong length without blowing up', () => {
    expect(isValidSignedLink('credencial-5', 'short', SECRET)).toBe(false);
    expect(isValidSignedLink('credencial-5', `${token}extra`, SECRET)).toBe(false);
  });

  it('refuses a token signed with another secret', () => {
    expect(isValidSignedLink('credencial-5', signLink('credencial-5', 'other'), SECRET)).toBe(
      false,
    );
  });
});
