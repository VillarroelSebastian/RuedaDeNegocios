import { describe, expect, it } from 'vitest';
import { COMPLEMENTARY_SECTORS, affinityBetween, compareByAffinity } from './sector-affinity.js';

describe('affinityBetween', () => {
  it('rates the same sector as high affinity', () => {
    expect(affinityBetween('Turismo', 'Turismo')).toBe('alta');
  });

  it('rates a declared complementary sector as medium affinity', () => {
    expect(affinityBetween('Turismo', 'Servicios Empresariales')).toBe('media');
  });

  it('reads the complementary table in both directions', () => {
    // Turismo lists Bioeconomía; the reverse entry must match just the same.
    expect(affinityBetween('Bioeconomía Amazónica', 'Turismo')).toBe('media');
    expect(affinityBetween('Turismo', 'Bioeconomía Amazónica')).toBe('media');
  });

  it('returns null for unrelated sectors', () => {
    expect(affinityBetween('Piscicultura', 'Servicios Empresariales')).toBeNull();
  });

  it('returns null when either sector is missing', () => {
    expect(affinityBetween(null, 'Turismo')).toBeNull();
    expect(affinityBetween('Turismo', null)).toBeNull();
  });

  it('returns null for a sector absent from the table', () => {
    expect(affinityBetween('Minería', 'Turismo')).toBeNull();
  });

  it('covers every sector the registration form offers', () => {
    expect(Object.keys(COMPLEMENTARY_SECTORS)).toHaveLength(12);
  });
});

describe('compareByAffinity', () => {
  const entry = (nombre: string, afinidad: 'alta' | 'media' | null, destacado = false) => ({
    nombre,
    afinidad,
    destacado,
  });

  it('puts high affinity before medium and medium before none', () => {
    const sorted = [entry('C', null), entry('A', 'alta'), entry('B', 'media')].sort(
      compareByAffinity,
    );

    expect(sorted.map((item) => item.nombre)).toEqual(['A', 'B', 'C']);
  });

  it('uses the package highlight only to break an affinity tie', () => {
    const sorted = [entry('plain', 'media'), entry('highlighted', 'media', true)].sort(
      compareByAffinity,
    );

    expect(sorted.map((item) => item.nombre)).toEqual(['highlighted', 'plain']);
  });

  it('never lets a highlight outrank a better affinity', () => {
    const sorted = [entry('highlighted', null, true), entry('affine', 'alta')].sort(
      compareByAffinity,
    );

    expect(sorted.map((item) => item.nombre)).toEqual(['affine', 'highlighted']);
  });

  it('falls back to the Spanish collation of the name', () => {
    const sorted = [entry('Zapata', null), entry('Ñandú', null), entry('Alfa', null)].sort(
      compareByAffinity,
    );

    expect(sorted.map((item) => item.nombre)).toEqual(['Alfa', 'Ñandú', 'Zapata']);
  });
});
