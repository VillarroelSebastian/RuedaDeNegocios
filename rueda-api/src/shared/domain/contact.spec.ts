import { describe, expect, it } from 'vitest';
import { normalizeEmail, normalizePhone, sameContact } from './contact.js';

describe('normalizePhone', () => {
  it('keeps only the digits, so formatting never creates a duplicate', () => {
    expect(normalizePhone('+591 700-00000')).toBe('59170000000');
  });

  it('returns an empty string for nothing usable', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
    expect(normalizePhone('abc')).toBe('');
  });

  it('accepts a non-string value', () => {
    expect(normalizePhone(70000000)).toBe('70000000');
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ana@Test.COM ')).toBe('ana@test.com');
  });

  it('returns an empty string for nothing usable', () => {
    expect(normalizeEmail(null)).toBe('');
  });
});

describe('sameContact', () => {
  it('matches two phone numbers written differently', () => {
    expect(sameContact('+591 700-00000', '59170000000')).toBe(true);
  });

  it('never matches when either side is empty', () => {
    expect(sameContact('', '')).toBe(false);
    expect(sameContact('70000000', '')).toBe(false);
  });
});
