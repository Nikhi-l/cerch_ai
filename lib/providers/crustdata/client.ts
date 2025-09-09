import type {
  Company,
  CompanyProvider,
  Person,
  PeopleProvider,
  ProviderResult,
  SearchQuery,
} from '../types';
import { normalizeCompanyRows, normalizePeopleRows } from '../normalize';
import { fetchWithTimeout } from '@/lib/network';
import { cookies } from 'next/headers';

const API_BASE = process.env.CRUSTDATA_API_BASE || 'https://api.crustdata.com';
const PEOPLE_PATH = process.env.CRUSTDATA_PEOPLE_PATH || '/screener/persondb/search/';
// Use the Company Search API for companies
const COMPANY_DISCOVERY_PATH =
  process.env.CRUSTDATA_COMPANY_SEARCH_PATH || '/screener/company/search';

function buildParams(query: SearchQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.filters) {
    for (const [k, v] of Object.entries(query.filters)) {
      if (v === undefined || v === null) continue;
      params.set(k, String(v));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function getCrustToken(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get('crustdata-api-token')?.value || '';
    if (fromCookie && fromCookie.trim().length > 0) return fromCookie.trim();
  } catch {
    // ignore if cookies() not available
  }
  return (
    process.env.CRUSTDATA_API_TOKEN || process.env.CRUSTDATA_API || ''
  );
}

async function crustFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = await getCrustToken();
  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Token ${token}`,
    },
    cache: 'no-store',
    timeoutMs: 60000,
  });
  if (!res.ok) {
    const msg = `Crust Data request failed: ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      console.error('[CRUSTDATA:CLIENT]', msg, '- Check CRUSTDATA_API_TOKEN and account permissions/credits.');
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

async function crustPost<T>(path: string, body: any): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = await getCrustToken();
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    timeoutMs: 60000,
  });
  if (!res.ok) {
    const msg = `Crust Data request failed: ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      console.error('[CRUSTDATA:CLIENT]', msg, '- Check CRUSTDATA_API_TOKEN and account permissions/credits.');
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

function debugEnabled() {
  return process.env.DEBUG_CRUSTDATA === 'true';
}

function dbg(...args: any[]) {
  if (debugEnabled()) console.log('[CRUSTDATA:CLIENT]', ...args);
}

export async function isCrustConfigured(): Promise<boolean> {
  const token = await getCrustToken();
  return Boolean(token && token.trim().length > 0);
}

function extractArray(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (json?.results && Array.isArray(json.results)) return json.results;
  if (json?.data?.results && Array.isArray(json.data.results))
    return json.data.results;
  if (json?.data && Array.isArray(json.data)) return json.data;
  if (json?.items && Array.isArray(json.items)) return json.items;
  if (json?.records && Array.isArray(json.records)) return json.records;
  if (json?.companies && Array.isArray(json.companies)) return json.companies;
  return [];
}

export async function getRemainingCredits(): Promise<number> {
  try {
    const data = await crustFetch<{ credits: number }>(`/user/credits`);
    return data.credits ?? 0;
  } catch {
    return 0;
  }
}

// --- People enrichment (basic profile) ---
// GET /screener/person/enrich/basic_profile?linkedin_profile_url=comma,separated
export async function enrichPeopleBasicProfile(linkedinUrls: string[]): Promise<any[]> {
  if (!Array.isArray(linkedinUrls) || linkedinUrls.length === 0) return [];
  const param = encodeURIComponent(linkedinUrls.join(','));
  const path = `/screener/person/enrich/basic_profile?linkedin_profile_url=${param}`;
  try {
    const json = await crustFetch<any>(path);
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.error('[CRUSTDATA:CLIENT] enrichPeopleBasicProfile error', (e as any)?.message || e);
    return [];
  }
}

// --- Filters Autocomplete helpers ---
type FilterType = 'region' | 'title' | 'industry' | 'school';
type AutocompleteItem = { value?: string; label?: string } | string;

export async function autocompleteFilter(
  filterType: FilterType,
  query: string,
  count = 10,
): Promise<string[]> {
  const url = `${API_BASE}/screener/linkedin_filter/autocomplete?filter_type=${encodeURIComponent(
    filterType,
  )}&query=${encodeURIComponent(query)}&count=${count}`;

  try {
    const token = await getCrustToken();
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Token ${token}` },
      cache: 'no-store',
      timeoutMs: 15000,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: AutocompleteItem[] } | any[];
    const arr: AutocompleteItem[] = Array.isArray(json)
      ? (json as any[])
      : Array.isArray((json as any).results)
        ? ((json as any).results as any[])
        : [];
    return arr
      .map((it) => (typeof it === 'string' ? it : it.value || it.label || ''))
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function resolveRegion(input: string): Promise<string | undefined> {
  if (!input) return undefined;
  const q = input.trim();
  const suggestions = await autocompleteFilter('region', q, 8);
  if (!suggestions.length) return undefined;
  const lower = q.toLowerCase();
  const exact = suggestions.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;
  const starts = suggestions.find((s) => s.toLowerCase().startsWith(lower));
  if (starts) return starts;
  return suggestions[0];
}

export async function resolveTitle(input: string): Promise<string | undefined> {
  if (!input) return undefined;
  const q = input.trim();
  const suggestions = await autocompleteFilter('title', q, 8);
  if (!suggestions.length) return undefined;
  const lower = q.toLowerCase();
  const exact = suggestions.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;
  const starts = suggestions.find((s) => s.toLowerCase().startsWith(lower));
  if (starts) return starts;
  return suggestions[0];
}

export const crustPeopleProvider: PeopleProvider = {
  async getPeople(query: SearchQuery): Promise<ProviderResult<Person>> {
    try {
      const limit = query.limit ?? 50;

      // Build a basic OR search across common text fields if q is concise and no filters present
      const shouldUseQ = Boolean(
        query.q && (!query.filters || (query.q && query.q.length <= 80)),
      );
      const qConditions = shouldUseQ
        ? [
            { column: 'name', type: '(.)', value: query.q },
            { column: 'headline', type: '(.)', value: query.q },
            { column: 'current_employers.title', type: '(.)', value: query.q },
            { column: 'current_employers.name', type: '(.)', value: query.q },
            { column: 'region', type: '(.)', value: query.q },
          ]
        : [];

      const filterConditions: any[] = [];
      if (query.filters) {
        for (const [k, v] of Object.entries(query.filters)) {
          if (v === undefined || v === null || v === '') continue;
          switch (k) {
            case 'title':
              if (typeof v === 'string' && v.includes('|')) {
                const parts = v.split('|').map((s) => s.trim()).filter(Boolean);
                if (parts.length) {
                  filterConditions.push({
                    op: 'or',
                    conditions: parts.map((p) => ({ column: 'current_employers.title', type: '(.)', value: p })),
                  } as any);
                }
              } else {
                filterConditions.push({ column: 'current_employers.title', type: '(.)', value: v });
              }
              break;
            case 'company':
              filterConditions.push({ column: 'current_employers.name', type: '(.)', value: v });
              break;
            case 'region':
            case 'location':
              filterConditions.push({ column: 'region', type: '(.)', value: v });
              break;
            case 'languages':
              if (typeof v === 'string' && v.includes('|')) {
                const parts = v.split('|').map((s) => s.trim()).filter(Boolean);
                filterConditions.push({ column: 'languages', type: 'in', value: parts });
              } else {
                filterConditions.push({ column: 'languages', type: 'in', value: Array.isArray(v) ? v : [v] });
              }
              break;
            case 'min_connections':
              filterConditions.push({ column: 'num_of_connections', type: '=>', value: v });
              break;
            case 'skills':
              filterConditions.push({ column: 'skills', type: '(.)', value: v });
              break;
            case 'industry':
              if (typeof v === 'string' && v.includes('|')) {
                const parts = v.split('|').map((s) => s.trim()).filter(Boolean);
                filterConditions.push({ column: 'all_employers.company_industries', type: 'in', value: parts });
              } else {
                filterConditions.push({ column: 'all_employers.company_industries', type: 'in', value: [String(v)] });
              }
              break;
            case 'years_of_experience_raw_min':
              filterConditions.push({ column: 'years_of_experience_raw', type: '=>', value: v });
              break;
            case 'years_of_experience_raw_max':
              filterConditions.push({ column: 'years_of_experience_raw', type: '=<', value: v });
              break;
            case 'employer_size_min':
              filterConditions.push({ column: 'current_employers.company_headcount_latest', type: '=>', value: v });
              break;
            case 'employer_size_max':
              filterConditions.push({ column: 'current_employers.company_headcount_latest', type: '=<', value: v });
              break;
            default:
              // Fallback to text match on headline
              filterConditions.push({ column: 'headline', type: '(.)', value: v });
          }
        }
      }

      const filters: any = {
        op: 'and',
        conditions: [
          ...(filterConditions.length ? filterConditions : []),
          ...(qConditions.length ? [{ op: 'or', conditions: qConditions }] : []),
        ],
      };

      const payload: any = { filters, limit };
      if ((query as any).cursor) payload.cursor = (query as any).cursor;
      dbg('getPeople: POST', {
        path: PEOPLE_PATH,
        limit,
        hasFilters: !!filters,
        q: shouldUseQ ? query.q ?? '' : '',
      });
      dbg('getPeople: filters payload', filters);
      const json = await crustPost<any>(PEOPLE_PATH, payload);
      const rawRows = Array.isArray(json?.profiles) ? json.profiles : extractArray(json);
      dbg('getPeople: response keys', Object.keys(json || {}));
      const rows = normalizePeopleRows(rawRows);
      dbg('getPeople: normalized rows', rows.length);
      return { rows, nextCursor: json?.next_cursor ?? null, source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    } catch (error: any) {
      console.error('[CRUSTDATA:CLIENT] getPeople: error', error?.message || error);
      return { rows: [], source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    }
  },
};

export const crustCompanyProvider: CompanyProvider = {
  async getCompanies(query: SearchQuery): Promise<ProviderResult<Company>> {
    try {
      const count = query.limit ?? 100;

      // Build filters in the Company Search API format
      type CompanyFilter =
        | { filter_type: 'INDUSTRY' | 'REGION'; type: 'in'; value: string[] }
        | { filter_type: 'COMPANY_HEADCOUNT'; type: 'in'; value: string[] };

      const filters: CompanyFilter[] = [];
      const qFilters = query.filters || {};

      if (qFilters.industry) {
        filters.push({ filter_type: 'INDUSTRY', type: 'in', value: [String(qFilters.industry)] });
      }
      if (qFilters.hq || qFilters.location || qFilters.country) {
        const region = String(qFilters.hq || qFilters.location || qFilters.country);
        filters.push({ filter_type: 'REGION', type: 'in', value: [region] });
      }

      // Map size range to LinkedIn headcount bands
      const bands = [
        { label: '1-10', min: 1, max: 10 },
        { label: '11-50', min: 11, max: 50 },
        { label: '51-200', min: 51, max: 200 },
        { label: '201-500', min: 201, max: 500 },
        { label: '501-1,000', min: 501, max: 1000 },
        { label: '1,001-5,000', min: 1001, max: 5000 },
        { label: '5,001-10,000', min: 5001, max: 10000 },
        { label: '10,001+', min: 10001, max: Number.POSITIVE_INFINITY },
      ];

      const sizeMin = Number(qFilters.size_min ?? NaN);
      const sizeMax = Number(qFilters.size_max ?? NaN);
      if (!Number.isNaN(sizeMin) || !Number.isNaN(sizeMax)) {
        const lo = Number.isNaN(sizeMin) ? 1 : sizeMin;
        const hi = Number.isNaN(sizeMax) ? Number.POSITIVE_INFINITY : sizeMax;
        const selected = bands
          .filter((b) => !(b.max < lo || b.min > hi))
          .map((b) => b.label);
        if (selected.length) {
          filters.push({ filter_type: 'COMPANY_HEADCOUNT', type: 'in', value: selected });
        }
      }

      const payload: any = { page: 1 };
      if (filters.length) payload.filters = filters;
      else if (query.q) payload.gpt_prompt = query.q; // only use prompt if we have no filters

      dbg('getCompanies: POST', {
        path: COMPANY_DISCOVERY_PATH,
        page: payload.page,
        hasFilters: !!payload.filters,
        hasPrompt: !!payload.gpt_prompt,
        q: query.q ?? '',
      });

      const json = await crustPost<any>(COMPANY_DISCOVERY_PATH, payload);
      const rawRows = extractArray(json);
      dbg('getCompanies: response keys', Object.keys(json || {}));
      const rows = normalizeCompanyRows(rawRows);
      dbg('getCompanies: normalized rows', rows.length);
      return { rows, source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    } catch (error: any) {
      console.error('[CRUSTDATA:CLIENT] getCompanies: error', error?.message || error);
      return { rows: [], source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    }
  },
};
