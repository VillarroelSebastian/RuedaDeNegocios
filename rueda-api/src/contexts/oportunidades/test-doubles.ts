import type { OpportunitiesRepositoryPort } from './domain/ports/opportunities.repository.port.js';
import type { MatchableCompany } from './domain/services/opportunity-matching.js';

/** In-memory double of the opportunities port, used by the use-case tests. */

export function buildMatchable(overrides: Partial<MatchableCompany> = {}): MatchableCompany {
  const id = overrides.empresaeventoId ?? 1;

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
    ciudad: 'Trinidad',
    pais: 'Bolivia',
    ...overrides,
  };
}

export interface FakeOpportunitiesOptions {
  mine?: MatchableCompany | null;
  granted?: MatchableCompany[];
}

export class FakeOpportunitiesRepository implements OpportunitiesRepositoryPort {
  readonly findCalls: number[] = [];

  constructor(private readonly options: FakeOpportunitiesOptions = {}) {}

  async findCompany(companyEventId: number): Promise<MatchableCompany | null> {
    this.findCalls.push(companyEventId);

    if (this.options.mine !== undefined) return this.options.mine;
    return (
      this.options.granted?.find((company) => company.empresaeventoId === companyEventId) ?? null
    );
  }

  async listGranted(): Promise<MatchableCompany[]> {
    return this.options.granted ?? [];
  }
}
