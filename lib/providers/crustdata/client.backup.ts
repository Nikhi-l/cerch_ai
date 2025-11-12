import type {
  Company,
  CompanyProvider,
  Person,
  PeopleProvider,
  ProviderResult,
  SearchQuery,
  CrustFilterCondition,
  CrustFilterNode,
} from '../types';
import { normalizeCompanyRows, normalizePeopleRows } from '../normalize';
import { fetchWithTimeout } from '@/lib/network';
import { cookies } from 'next/headers';

export class CrustdataError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'CrustdataError';
    this.status = status;
    this.body = body;
  }
}

const API_BASE = process.env.CRUSTDATA_API_BASE || 'https://api.crustdata.com';
const PEOPLE_PATH = process.env.CRUSTDATA_PEOPLE_PATH || '/screener/persondb/search/';
// Use the Company Search API for companies
const COMPANY_DISCOVERY_PATH =
  process.env.CRUSTDATA_COMPANY_SEARCH_PATH || '/screener/company/search';

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
  if (!token) {
    throw new CrustdataError('Crustdata API token is not configured.', 401);
  }
  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Token ${token}`,
    },
    cache: 'no-store',
    timeoutMs: 60000,
  });
  return await handleCrustResponse<T>(res);
}

async function crustPost<T>(path: string, body: any): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = await getCrustToken();
  if (!token) {
    throw new CrustdataError('Crustdata API token is not configured.', 401);
  }
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
  return await handleCrustResponse<T>(res);
}

async function handleCrustResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let payload: unknown;

  if (text && contentType.includes('application/json')) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  } else {
    payload = text;
  }

  if (!res.ok) {
    const detail =
      (payload as any)?.detail ||
      (payload as any)?.message ||
      (payload as any)?.error ||
      (typeof payload === 'string' && payload.trim().length ? payload : null);
    const msg = detail
      ? `Crustdata request failed: ${detail}`
      : `Crustdata request failed with status ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      console.error('[CRUSTDATA:CLIENT]', msg, '- Check CRUSTDATA_API_TOKEN and account permissions/credits.');
    } else {
      console.error('[CRUSTDATA:CLIENT]', msg);
    }
    throw new CrustdataError(msg, res.status, payload);
  }

  if (payload == null || payload === '') {
    return {} as T;
  }

  return payload as T;
}

function debugEnabled() {
  return process.env.DEBUG_CRUSTDATA === 'true';
}

function dbg(...args: any[]) {
  if (debugEnabled()) console.log('[CRUSTDATA:CLIENT]', ...args);
}

const TEXT_SEARCH_COLUMNS = [
  'headline',
  'summary',
  'skills',
  'current_employers.title',
  'current_employers.name',
  'name',
];

function makeCondition(
  column: string,
  type: CrustFilterCondition['type'],
  value: CrustFilterCondition['value'],
): CrustFilterCondition {
  return { column, type, value };
}

function asAndGroup(nodes: CrustFilterNode[]): CrustFilterNode | undefined {
  if (!nodes.length) return undefined;
  if (nodes.length === 1) return nodes[0];
  return { op: 'and', conditions: nodes };
}

function textSearchNode(term: string): CrustFilterNode {
  return {
    op: 'or',
    conditions: TEXT_SEARCH_COLUMNS.map((column) =>
      makeCondition(column, '(.)', term),
    ),
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function splitValues(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  return value
    .split(/[,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isCrustFilterNode(value: any): value is CrustFilterNode {
  return (
    value != null &&
    typeof value === 'object' &&
    (Object.prototype.hasOwnProperty.call(value, 'column') ||
      Object.prototype.hasOwnProperty.call(value, 'op'))
  );
}

function recordToFilterNode(
  record: Record<string, string | number | boolean>,
  fallbackTerm: string,
): CrustFilterNode {
  const nodes: CrustFilterNode[] = [];

  for (const [key, raw] of Object.entries(record)) {
    if (raw === undefined || raw === null || raw === '') continue;
    switch (key) {
      case 'title': {
        const titles = splitValues(String(raw));
        if (titles.length) {
          const titleConditions = titles.map((title) =>
            makeCondition('current_employers.title', '(.)', title),
          );
          nodes.push(
            titleConditions.length === 1
              ? titleConditions[0]
              : ({ op: 'or', conditions: titleConditions } as CrustFilterNode),
          );
        }
        break;
      }
      case 'company':
        nodes.push(makeCondition('current_employers.name', '(.)', String(raw)));
        break;
      case 'region':
      case 'location':
        nodes.push(makeCondition('region', '(.)', String(raw)));
        break;
      case 'skills':
        {
          const tokens = splitValues(String(raw));
          if (tokens.length) {
            const skillConditions = uniqueStrings(tokens).map((token) =>
              makeCondition('skills', '(.)', token),
            );
            nodes.push(
              skillConditions.length === 1
                ? skillConditions[0]
                : ({ op: 'or', conditions: skillConditions } as CrustFilterNode),
            );
          }
        }
        break;
      case 'languages': {
        const values = splitValues(String(raw));
        if (values.length) nodes.push(makeCondition('languages', 'in', values));
        break;
      }
      case 'min_connections':
        nodes.push(makeCondition('num_of_connections', '=>', Number(raw)));
        break;
      case 'years_of_experience_raw_min':
        nodes.push(makeCondition('years_of_experience_raw', '=>', Number(raw)));
        break;
      case 'years_of_experience_raw_max':
        nodes.push(makeCondition('years_of_experience_raw', '=<', Number(raw)));
        break;
      case 'employer_size_min':
        nodes.push(
          makeCondition('current_employers.company_headcount_latest', '=>', Number(raw)),
        );
        break;
      case 'employer_size_max':
        nodes.push(
          makeCondition('current_employers.company_headcount_latest', '=<', Number(raw)),
        );
        break;
      case 'industry': {
        const values = splitValues(String(raw));
        if (values.length) {
          const industryConditions = uniqueStrings(values).map((value) =>
            makeCondition('all_employers.company_industries', '(.)', value),
          );
          nodes.push(
            industryConditions.length === 1
              ? industryConditions[0]
              : ({ op: 'or', conditions: industryConditions } as CrustFilterNode),
          );
        }
        break;
      }
      default:
        nodes.push(makeCondition('headline', '(.)', String(raw)));
    }
  }

  if (!nodes.length) {
    const term = fallbackTerm.trim();
    return term ? textSearchNode(term) : makeCondition('headline', '(.)', 'engineer');
  }

  return asAndGroup(nodes) ?? makeCondition('headline', '(.)', 'engineer');
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

export const crustPeopleProvider: PeopleProvider = {
  async getPeople(query: SearchQuery): Promise<ProviderResult<Person>> {
    try {
      const limit = query.limit ?? 50;
      const payload: any = { limit };
      const fallbackTerm = (query.q || '').trim();

      let filtersNode: CrustFilterNode | undefined;
      if (isCrustFilterNode(query.filters)) {
        filtersNode = query.filters as CrustFilterNode;
      } else if (query.filters && typeof query.filters === 'object') {
        filtersNode = recordToFilterNode(
          query.filters as Record<string, string | number | boolean>,
          fallbackTerm,
        );
      }

      if (!filtersNode) {
        const term = fallbackTerm || 'engineer';
        filtersNode = textSearchNode(term);
      }

      payload.filters = filtersNode;
      if ((query as any).cursor) payload.cursor = (query as any).cursor;
      dbg('getPeople: POST', {
        path: PEOPLE_PATH,
        limit,
        hasFilters: !!filtersNode,
        q: fallbackTerm,
      });
      dbg('getPeople: filters payload', payload.filters);
      const json = await crustPost<any>(PEOPLE_PATH, payload);
      const rawRows = Array.isArray(json?.profiles) ? json.profiles : extractArray(json);
      dbg('getPeople: response keys', Object.keys(json || {}));
      const rows = normalizePeopleRows(rawRows);
      dbg('getPeople: normalized rows', rows.length);
      return { rows, nextCursor: json?.next_cursor ?? null, source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    } catch (error: any) {
      const message = error instanceof CrustdataError ? error.message : error?.message || String(error);
      console.error('[CRUSTDATA:CLIENT] getPeople: error', message);
      throw error;
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
      const qFilters =
        query.filters && !isCrustFilterNode(query.filters)
          ? (query.filters as Record<string, string | number | boolean>)
          : {};

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
      const message = error instanceof CrustdataError ? error.message : error?.message || String(error);
      console.error('[CRUSTDATA:CLIENT] getCompanies: error', message);
      throw error;
    }
  },
};
