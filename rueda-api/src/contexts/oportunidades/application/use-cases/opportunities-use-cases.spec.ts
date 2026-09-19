import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import { FakeOpportunitiesRepository, buildMatchable } from '../../test-doubles.js';
import {
  ListEventPairingsUseCase,
  ListMyOpportunitiesUseCase,
} from './list-opportunities.use-cases.js';

describe('ListMyOpportunitiesUseCase', () => {
  it('refuses to answer when the caller has no enrollment', async () => {
    const repository = new FakeOpportunitiesRepository({ mine: null });

    await expect(new ListMyOpportunitiesUseCase(repository).execute(7)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('reads the enrollment the caller was authenticated with', async () => {
    const repository = new FakeOpportunitiesRepository({ mine: buildMatchable() });

    await new ListMyOpportunitiesUseCase(repository).execute(41);

    expect(repository.findCalls).toEqual([41]);
  });

  it('leaves the company itself out of its own opportunities', async () => {
    const mine = buildMatchable({ empresaeventoId: 1, rubro: 'Turismo' });
    const repository = new FakeOpportunitiesRepository({
      mine,
      granted: [mine, buildMatchable({ empresaeventoId: 2, rubro: 'Turismo' })],
    });

    const found = await new ListMyOpportunitiesUseCase(repository).execute(1);

    expect(found.map((match) => match.empresaeventoId)).toEqual([2]);
  });

  it('keeps only the companies there is a reason to meet', async () => {
    const mine = buildMatchable({ empresaeventoId: 1, demanda: 'madera certificada' });
    const repository = new FakeOpportunitiesRepository({
      mine,
      granted: [
        mine,
        buildMatchable({ empresaeventoId: 2, oferta: 'madera tratada' }),
        buildMatchable({ empresaeventoId: 3, oferta: 'turismo receptivo' }),
      ],
    });

    const found = await new ListMyOpportunitiesUseCase(repository).execute(1);

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      empresaeventoId: 2,
      motivos: ['Su oferta coincide con lo que buscas'],
    });
  });

  it('shows the company with the most reasons first', async () => {
    const mine = buildMatchable({
      empresaeventoId: 1,
      oferta: 'madera',
      demanda: 'camiones',
    });
    const repository = new FakeOpportunitiesRepository({
      mine,
      granted: [
        mine,
        buildMatchable({ empresaeventoId: 2, nombre: 'Solo compra', demanda: 'madera' }),
        buildMatchable({
          empresaeventoId: 3,
          nombre: 'Compra y vende',
          oferta: 'camiones',
          demanda: 'madera',
        }),
      ],
    });

    const found = await new ListMyOpportunitiesUseCase(repository).execute(1);

    expect(found.map((match) => match.nombre)).toEqual(['Compra y vende', 'Solo compra']);
  });

  it('answers with an actionable list, not with the whole event', async () => {
    const mine = buildMatchable({ empresaeventoId: 1, rubro: 'Turismo' });
    const granted = [mine];
    for (let id = 2; id <= 45; id += 1) {
      granted.push(buildMatchable({ empresaeventoId: id, rubro: 'Turismo' }));
    }
    const repository = new FakeOpportunitiesRepository({ mine, granted });

    const found = await new ListMyOpportunitiesUseCase(repository).execute(1);

    expect(found).toHaveLength(30);
  });
});

describe('ListEventPairingsUseCase', () => {
  it('has nothing to suggest while the event has no companies', async () => {
    const repository = new FakeOpportunitiesRepository({ granted: [] });

    expect(await new ListEventPairingsUseCase(repository).execute()).toEqual([]);
  });

  it('suggests the meetings the event should arrange', async () => {
    const repository = new FakeOpportunitiesRepository({
      granted: [
        buildMatchable({ empresaeventoId: 1, nombre: 'Maderas', oferta: 'madera' }),
        buildMatchable({ empresaeventoId: 2, nombre: 'Constructora', demanda: 'madera' }),
      ],
    });

    const pairings = await new ListEventPairingsUseCase(repository).execute();

    expect(pairings).toHaveLength(1);
    expect(pairings[0]?.empresaA.nombre).toBe('Maderas');
    expect(pairings[0]?.empresaB.nombre).toBe('Constructora');
  });
});
