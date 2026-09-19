import type { AssistantCompany } from '../../domain/models/assistant-view.js';

/**
 * The companies the assistant may name. Implemented by the companies context,
 * which owns what makes a company visible in an event.
 */
export interface CompanyDirectoryPort {
  /**
   * The event the caller's enrollment belongs to. The assistant answers about
   * that event even if the administrator switches the running one mid-chat.
   */
  findActiveEventOf(companyEventId: number): Promise<number | null>;

  /** Companies granted access to the event, whatever their payment state. */
  listEnabled(eventId: number): Promise<AssistantCompany[]>;

  /** One company, looked up by its visible code or by part of its name. */
  findByTerm(eventId: number, term: string): Promise<AssistantCompany | null>;

  /**
   * Companies a meeting may be requested from: access granted and payment
   * completed. An empty term lists them all. The caller is always left out.
   */
  listBookable(
    eventId: number,
    exceptCompanyEventId: number,
    term: string,
  ): Promise<AssistantCompany[]>;
}

export const COMPANY_DIRECTORY_PORT = Symbol('CompanyDirectoryPort');
