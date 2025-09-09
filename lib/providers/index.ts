import type {
  Company,
  CompanyProvider,
  Person,
  PeopleProvider,
  ProviderResult,
  SearchQuery,
} from './types';
import { sortPeopleByImage } from './sort';

export async function aggregatePeople(
  query: SearchQuery,
  providers: PeopleProvider[],
): Promise<ProviderResult<Person>> {
  const debug = process.env.DEBUG_CRUSTDATA === 'true';
  if (debug) console.log('[CRUSTDATA:AGG] aggregatePeople: query', query);
  const results = await Promise.allSettled(providers.map((p) => p.getPeople(query)));

  const rows: Person[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      rows.push(...r.value.rows);
    }
  }
  if (debug) console.log('[CRUSTDATA:AGG] aggregatePeople: rows aggregated', rows.length);
  // Prefer profiles with images at the top by default
  const sorted = sortPeopleByImage(rows);
  return { rows: sorted, source: 'llm' };
}

export async function aggregateCompanies(
  query: SearchQuery,
  providers: CompanyProvider[],
): Promise<ProviderResult<Company>> {
  const debug = process.env.DEBUG_CRUSTDATA === 'true';
  if (debug) console.log('[CRUSTDATA:AGG] aggregateCompanies: query', query);
  const results = await Promise.allSettled(providers.map((p) => p.getCompanies(query)));

  const rows: Company[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      rows.push(...r.value.rows);
    }
  }
  if (debug) console.log('[CRUSTDATA:AGG] aggregateCompanies: rows aggregated', rows.length);
  return { rows, source: 'llm' };
}
