import { describe, expect, it } from 'vitest';
import { companyCodeFor, companyCodePrefix } from './company-code.js';

describe('companyCodePrefix', () => {
  it('takes the initials once there are at least three meaningful words', () => {
    expect(companyCodePrefix('Distribuidora Amazonas del Sur Beni')).toBe('DASB');
  });

  it('drops corporate suffixes before counting words', () => {
    // `Agro Beni SRL` leaves two words, which yields only two initials, so the
    // first word supplies the prefix instead.
    expect(companyCodePrefix('Agro Beni SRL')).toBe('AGR');
    expect(companyCodePrefix('Empresa Distribuidora del Sur')).toBe('DIS');
  });

  it('strips accents', () => {
    expect(companyCodePrefix('Óptica Ñandú Zafiro')).toBe('ONZ');
  });

  it('ignores punctuation', () => {
    expect(companyCodePrefix('Trans-Beni & Co. Amazonas')).toBe('TBCA');
  });

  it('caps the prefix at four initials', () => {
    expect(companyCodePrefix('Alfa Bravo Charlie Delta Echo')).toBe('ABCD');
  });

  it('pads a short result from the first word instead of leaving it tiny', () => {
    // A single meaningful word would give one initial, which reads as nothing.
    expect(companyCodePrefix('Zafiro')).toBe('ZAF');
  });

  it('pads a very short word with X', () => {
    expect(companyCodePrefix('Ab')).toBe('ABX');
  });

  it('falls back to the raw words when every one is a stop word', () => {
    // No meaningful word survives, so `La Empresa` is used as written, and the
    // two initials again fall back to the first word.
    expect(companyCodePrefix('La Empresa')).toBe('LAX');
    expect(companyCodePrefix('De La Empresa Y Cia')).toBe('DLEY');
  });

  it('falls back to EMP for a name with nothing usable', () => {
    expect(companyCodePrefix('')).toBe('EMP');
    expect(companyCodePrefix('---')).toBe('EMP');
  });
});

describe('companyCodeFor', () => {
  it('combines the prefix with a zero padded id', () => {
    expect(companyCodeFor('Agro Beni SRL', 12)).toBe('RB-AGR-0012');
  });

  it('keeps longer ids intact', () => {
    expect(companyCodeFor('Agro Beni SRL', 123456)).toBe('RB-AGR-123456');
  });

  it('appends a suffix to resolve a collision', () => {
    expect(companyCodeFor('Agro Beni SRL', 12, 1)).toBe('RB-AGR-0012-1');
  });
});
