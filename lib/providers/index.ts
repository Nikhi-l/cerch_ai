import type {
  Company,
  CompanyProvider,
  Person,
  PeopleProvider,
  ProviderResult,
  SearchQuery,
} from './types';

export async function aggregatePeople(
  query: SearchQuery,
  providers: PeopleProvider[],
): Promise<ProviderResult<Person>> {
  const results = await Promise.allSettled(
    providers.map((p) => p.getPeople(query)),
  );

  const rows: Person[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      rows.push(...r.value.rows);
    }
  }

  return { rows, source: 'llm' };
}

export async function aggregateCompanies(
  query: SearchQuery,
  providers: CompanyProvider[],
): Promise<ProviderResult<Company>> {
  const results = await Promise.allSettled(
    providers.map((p) => p.getCompanies(query)),
  );

  const rows: Company[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      rows.push(...r.value.rows);
    }
  }

  return { rows, source: 'llm' };
}

