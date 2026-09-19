import type { MatchableCompany } from '../services/opportunity-matching.js';

export interface OpportunitiesRepositoryPort {
  /** The company behind the caller's enrollment, whatever its state. */
  findCompany(companyEventId: number): Promise<MatchableCompany | null>;

  /**
   * Companies taking part in the running event: paid, granted access and still
   * active. Ordered by name, so equally relevant matches keep a stable order.
   */
  listGranted(): Promise<MatchableCompany[]>;
}

export const OPPORTUNITIES_REPOSITORY = Symbol('OpportunitiesRepositoryPort');
