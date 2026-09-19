import { Inject, Injectable } from '@nestjs/common';
import { type Paginated, clampLimit, clampPage } from '../../../../shared/domain/pagination.js';
import {
  COMPANY_REPOSITORY,
  type CompanyListItem,
  type CompanyRepositoryPort,
} from '../../domain/ports/company.repository.port.js';

export interface ListCompaniesQuery {
  search?: string;
  estadoPago?: string;
  ciudad?: string;
  rubro?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 10;
/** Upper bound so one request can never pull the whole table. */
const MAX_LIMIT = 100;

@Injectable()
export class ListCompaniesUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepositoryPort) {}

  execute(query: ListCompaniesQuery): Promise<Paginated<CompanyListItem>> {
    return this.companies.list({
      search: query.search,
      estadoPago: query.estadoPago,
      ciudad: query.ciudad,
      rubro: query.rubro,
      page: clampPage(query.page),
      limit: clampLimit(query.limit, DEFAULT_LIMIT, MAX_LIMIT),
    });
  }
}
