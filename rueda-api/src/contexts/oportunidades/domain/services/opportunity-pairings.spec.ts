import { describe, expect, it } from 'vitest';
import type { MatchableCompany } from './opportunity-matching.js';
import { rankPairings } from './opportunity-pairings.js';

let nextId = 1;

function company(overrides: Partial<MatchableCompany> = {}): MatchableCompany {
  const id = overrides.empresaeventoId ?? nextId++;

  return {
    empresaeventoId: id,
    empresaId: id * 10,
    codigo: `E-${id}`,
    nombre: `Empresa ${id}`,
    rubro: null,
    oferta: null,
    demanda: null,
    interesesBusqueda: null,
    urlFotoPerfil: null,
    ciudad: null,
    pais: null,
    ...overrides,
  };
}

describe('rankPairings', () => {
  it('has nothing to pair with fewer than two companies', () => {
    expect(rankPairings([])).toEqual([]);
    expect(rankPairings([company({ empresaeventoId: 1 })])).toEqual([]);
  });

  it('pairs a supplier with the company that needs what it sells', () => {
    const supplier = company({ empresaeventoId: 1, nombre: 'Maderas', oferta: 'madera tratada' });
    const buyer = company({ empresaeventoId: 2, nombre: 'Constructora', demanda: 'madera' });

    expect(rankPairings([supplier, buyer])).toEqual([
      {
        empresaA: { empresaeventoId: 1, nombre: 'Maderas', codigo: 'E-1', rubro: null },
        empresaB: { empresaeventoId: 2, nombre: 'Constructora', codigo: 'E-2', rubro: null },
        motivos: ['Maderas ofrece lo que busca Constructora'],
      },
    ]);
  });

  it('leaves out companies with nothing in common', () => {
    const left = company({ empresaeventoId: 1, oferta: 'madera' });
    const right = company({ empresaeventoId: 2, oferta: 'turismo receptivo' });

    expect(rankPairings([left, right])).toEqual([]);
  });

  it('proposes a pair once, whichever side found it', () => {
    const left = company({ empresaeventoId: 1, oferta: 'madera', demanda: 'camiones' });
    const right = company({ empresaeventoId: 2, oferta: 'camiones', demanda: 'madera' });

    const pairings = rankPairings([left, right]);

    expect(pairings).toHaveLength(1);
    expect(pairings[0]?.motivos).toHaveLength(2);
  });

  it('always puts the lower enrollment first, so a pair reads the same way', () => {
    const later = company({ empresaeventoId: 9, nombre: 'Novena', oferta: 'madera' });
    const earlier = company({ empresaeventoId: 4, nombre: 'Cuarta', demanda: 'madera' });

    const [pairing] = rankPairings([later, earlier]);

    expect(pairing?.empresaA.empresaeventoId).toBe(4);
    expect(pairing?.empresaB.empresaeventoId).toBe(9);
  });

  it('shows the strongest match before the weaker ones', () => {
    const companies = [
      company({ empresaeventoId: 1, nombre: 'Aserradero', oferta: 'madera', demanda: 'camiones' }),
      company({ empresaeventoId: 2, nombre: 'Flota', oferta: 'camiones', demanda: 'madera' }),
      company({ empresaeventoId: 3, nombre: 'Hotel Uno', rubro: 'Turismo' }),
      company({ empresaeventoId: 4, nombre: 'Hotel Dos', rubro: 'Turismo' }),
    ];

    const pairings = rankPairings(companies);

    expect(pairings[0]?.motivos).toHaveLength(2);
    expect(pairings.at(-1)?.motivos).toEqual(['Empresas del mismo rubro']);
  });

  it('reaches every company that has a match, not only the first ones', () => {
    const companies = [
      company({ empresaeventoId: 1, oferta: 'madera', demanda: 'camiones' }),
      company({ empresaeventoId: 2, oferta: 'camiones', demanda: 'madera' }),
      company({ empresaeventoId: 3, oferta: 'soja', demanda: 'fertilizante' }),
      company({ empresaeventoId: 4, oferta: 'fertilizante', demanda: 'soja' }),
    ];

    const paired = new Set(
      rankPairings(companies).flatMap((pairing) => [
        pairing.empresaA.empresaeventoId,
        pairing.empresaB.empresaeventoId,
      ]),
    );

    expect([...paired].sort((left, right) => left - right)).toEqual([1, 2, 3, 4]);
  });

  it('breaks a score tie by name, so the list does not shuffle between reads', () => {
    const companies = [
      company({ empresaeventoId: 1, nombre: 'Zeta', rubro: 'Turismo' }),
      company({ empresaeventoId: 2, nombre: 'Alfa', rubro: 'Turismo' }),
      company({ empresaeventoId: 3, nombre: 'Beta', rubro: 'Turismo' }),
    ];

    const names = rankPairings(companies).map((pairing) => pairing.empresaA.nombre);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  });
});
