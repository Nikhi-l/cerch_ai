import type {
  Company,
  CompanyProvider,
  Person,
  PeopleProvider,
  ProviderResult,
  SearchQuery,
} from '../types';

export const xiPeopleProvider: PeopleProvider = {
  async getPeople(_query: SearchQuery): Promise<ProviderResult<Person>> {
    // TODO: Implement after XI API docs are available.
    return { rows: [], source: 'xi', creditCost: { provider: 'xi', estimated: 0 } };
  },
};

export const xiCompanyProvider: CompanyProvider = {
  async getCompanies(_query: SearchQuery): Promise<ProviderResult<Company>> {
    // TODO: Implement after XI API docs are available.
    return { rows: [], source: 'xi', creditCost: { provider: 'xi', estimated: 0 } };
  },
};

