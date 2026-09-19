import { describe, expect, it } from 'vitest';
import type { MatchableCompany } from './opportunity-matching.js';
import {
  evaluatePair,
  keywordsOf,
  reasonsToMeet,
  shareKeywords,
} from './opportunity-matching.js';

function company(overrides: Partial<MatchableCompany> = {}): MatchableCompany {
  return {
    empresaeventoId: 1,
    empresaId: 10,
    codigo: 'E-001',
    nombre: 'Maderas del Norte',
    rubro: 'Forestal y Maderero',
    oferta: null,
    demanda: null,
    interesesBusqueda: null,
    urlFotoPerfil: null,
    ciudad: 'Trinidad',
    pais: 'Bolivia',
    ...overrides,
  };
}

describe('keywordsOf', () => {
  it('drops accents and case, so "Producción" meets "produccion"', () => {
    expect(keywordsOf('Producción')).toEqual(['produccion']);
  });

  it('ignores words shorter than four letters, which carry no signal', () => {
    expect(keywordsOf('soja y maiz de exportacion')).toEqual(['soja', 'maiz', 'exportacion']);
  });

  it('keeps each word once', () => {
    expect(keywordsOf('madera madera certificada')).toEqual(['madera', 'certificada']);
  });

  it('reads nothing out of an empty text', () => {
    expect(keywordsOf(null)).toEqual([]);
    expect(keywordsOf('')).toEqual([]);
  });
});

describe('shareKeywords', () => {
  it('matches two texts that have a word in common', () => {
    expect(shareKeywords('Vendemos madera certificada', 'Compramos madera')).toBe(true);
  });

  it('does not match texts with nothing in common', () => {
    expect(shareKeywords('Vendemos madera', 'Compramos soja')).toBe(false);
  });

  it('does not match when either text is missing', () => {
    expect(shareKeywords(null, 'Compramos madera')).toBe(false);
    expect(shareKeywords('Vendemos madera', undefined)).toBe(false);
  });
});

describe('reasonsToMeet', () => {
  it('tells the company when the other one is looking for its sector', () => {
    const mine = company({ rubro: 'Agroindustria' });
    const theirs = company({ empresaeventoId: 2, interesesBusqueda: 'Buscamos agroindustria' });

    expect(reasonsToMeet(mine, theirs)).toContain('Busca empresas del rubro "Agroindustria"');
  });

  it('tells the company when the other one matches its own declared interest', () => {
    const mine = company({ interesesBusqueda: 'Buscamos agroindustria' });
    const theirs = company({ empresaeventoId: 2, rubro: 'Agroindustria' });

    expect(reasonsToMeet(mine, theirs)).toContain('Coincide con tu interés declarado');
  });

  it('matches what the other one offers against what the company needs', () => {
    const mine = company({ demanda: 'Necesitamos madera certificada' });
    const theirs = company({ empresaeventoId: 2, oferta: 'Vendemos madera' });

    expect(reasonsToMeet(mine, theirs)).toContain('Su oferta coincide con lo que buscas');
  });

  it('matches what the other one needs against what the company offers', () => {
    const mine = company({ oferta: 'Vendemos madera' });
    const theirs = company({ empresaeventoId: 2, demanda: 'Compramos madera' });

    expect(reasonsToMeet(mine, theirs)).toContain('Busca lo que tu empresa ofrece');
  });

  it('falls back to the shared sector only when nothing else matched', () => {
    const mine = company({ rubro: 'Turismo' });
    const theirs = company({ empresaeventoId: 2, rubro: 'Turismo' });

    expect(reasonsToMeet(mine, theirs)).toEqual(['Mismo rubro que tu empresa']);
  });

  it('leaves out the shared sector when a stronger reason already holds', () => {
    const mine = company({ rubro: 'Turismo', demanda: 'Buscamos hoteles' });
    const theirs = company({ empresaeventoId: 2, rubro: 'Turismo', oferta: 'Hoteles en Trinidad' });

    expect(reasonsToMeet(mine, theirs)).toEqual(['Su oferta coincide con lo que buscas']);
  });

  it('finds no reason between two unrelated companies', () => {
    const mine = company({ rubro: 'Turismo' });
    const theirs = company({ empresaeventoId: 2, rubro: 'Piscicultura' });

    expect(reasonsToMeet(mine, theirs)).toEqual([]);
  });
});

describe('evaluatePair', () => {
  it('scores each direction of a supply and demand match', () => {
    const left = company({ nombre: 'Maderas', oferta: 'madera', demanda: 'camiones' });
    const right = company({
      empresaeventoId: 2,
      nombre: 'Transportes',
      oferta: 'camiones',
      demanda: 'madera',
    });

    const result = evaluatePair(left, right);

    expect(result.puntaje).toBe(8);
    expect(result.motivos).toEqual([
      'Maderas ofrece lo que busca Transportes',
      'Transportes ofrece lo que busca Maderas',
    ]);
  });

  it('scores a sector meeting a declared interest below a supply match', () => {
    const left = company({ rubro: 'Agroindustria' });
    const right = company({ empresaeventoId: 2, interesesBusqueda: 'agroindustria' });

    expect(evaluatePair(left, right)).toEqual({
      motivos: ['Coincidencia de rubro e intereses'],
      puntaje: 2,
    });
  });

  it('gives the lowest score to companies that only share their sector', () => {
    const left = company({ rubro: 'Turismo' });
    const right = company({ empresaeventoId: 2, rubro: 'Turismo' });

    expect(evaluatePair(left, right)).toEqual({
      motivos: ['Empresas del mismo rubro'],
      puntaje: 1,
    });
  });

  it('finds nothing to say about two unrelated companies', () => {
    const left = company({ rubro: 'Turismo' });
    const right = company({ empresaeventoId: 2, rubro: 'Piscicultura' });

    expect(evaluatePair(left, right)).toEqual({ motivos: [], puntaje: 0 });
  });
});
