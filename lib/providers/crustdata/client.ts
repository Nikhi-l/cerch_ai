import type {
  Company,
  CompanyProvider,
  Person,
  PeopleProvider,
  ProviderResult,
  SearchQuery,
} from '../types';
import { normalizeCompanyRows, normalizePeopleRows } from '../normalize';

const API_BASE = process.env.CRUSTDATA_API_BASE || 'https://api.crustdata.com';
const CRUST_TOKEN =
  process.env.CRUSTDATA_API_TOKEN || process.env.CRUSTDATA_API || '';
const PEOPLE_PATH = process.env.CRUSTDATA_PEOPLE_PATH || '/screener/persondb/search/';
const COMPANY_DISCOVERY_PATH = process.env.CRUSTDATA_COMPANY_DISCOVERY_PATH || '/screener/screen/';

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

async function crustFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${CRUST_TOKEN}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Crust Data request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function crustPost<T>(path: string, body: any): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${CRUST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Crust Data request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function extractArray(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (json?.results && Array.isArray(json.results)) return json.results;
  if (json?.data?.results && Array.isArray(json.data.results))
    return json.data.results;
  if (json?.data && Array.isArray(json.data)) return json.data;
  if (json?.items && Array.isArray(json.items)) return json.items;
  if (json?.records && Array.isArray(json.records)) return json.records;
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

export const crustPeopleProvider: PeopleProvider = {
  async getPeople(query: SearchQuery): Promise<ProviderResult<Person>> {
    try {
      const limit = query.limit ?? 50;

      // Build a basic OR search across common text fields if q is provided
      const qConditions = query.q
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
              filterConditions.push({ column: 'current_employers.title', type: '(.)', value: v });
              break;
            case 'company':
              filterConditions.push({ column: 'current_employers.name', type: '(.)', value: v });
              break;
            case 'region':
            case 'location':
              filterConditions.push({ column: 'region', type: '(.)', value: v });
              break;
            case 'languages':
              filterConditions.push({ column: 'languages', type: 'in', value: Array.isArray(v) ? v : [v] });
              break;
            case 'min_connections':
              filterConditions.push({ column: 'num_of_connections', type: '=>', value: v });
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

      const json = await crustPost<any>(PEOPLE_PATH, { filters, limit });
      const rawRows = Array.isArray(json?.profiles) ? json.profiles : extractArray(json);
      const rows = normalizePeopleRows(rawRows);
      return { rows, source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    } catch (_) {
      return { rows: [], source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    }
  },
};

export const crustCompanyProvider: CompanyProvider = {
  async getCompanies(query: SearchQuery): Promise<ProviderResult<Company>> {
    try {
      const count = query.limit ?? 100;
      const conditions: any[] = [];

      if (query.filters) {
        for (const [k, v] of Object.entries(query.filters)) {
          if (v === undefined || v === null || v === '') continue;
          switch (k) {
            case 'industry':
              conditions.push({ column: 'taxonomy.linkedin_industries', type: '(.)', value: v });
              break;
            case 'location':
            case 'hq':
              conditions.push({ column: 'headquarters', type: '(.)', value: v });
              break;
            case 'country':
              conditions.push({ column: 'hq_country', type: '(.)', value: v });
              break;
            case 'size_min':
              conditions.push({ column: 'linkedin_headcount', type: '=>', value: v });
              break;
            case 'size_max':
              conditions.push({ column: 'linkedin_headcount', type: '=<', value: v });
              break;
            case 'year_founded_min':
              conditions.push({ column: 'year_founded', type: '=>', value: v });
              break;
            case 'year_founded_max':
              conditions.push({ column: 'year_founded', type: '=<', value: v });
              break;
            default:
              // Generic text match on name/website
              conditions.push({ column: 'company_name', type: '(.)', value: v });
          }
        }
      }

      const payload: any = { count };

      if (query.q && (!query.filters || Object.keys(query.filters).length === 0)) {
        // Use AI-powered search for natural language
        payload.gpt_prompt = query.q;
      } else {
        const qConditions = query.q
          ? [
              { column: 'company_name', type: '(.)', value: query.q },
              { column: 'company_website', type: '(.)', value: query.q },
              { column: 'hq_country', type: '(.)', value: query.q },
            ]
          : [];
        payload.filters = {
          op: 'and',
          conditions: [
            ...(conditions.length ? conditions : []),
            ...(qConditions.length ? [{ op: 'or', conditions: qConditions }] : []),
          ],
        };
      }

      const json = await crustPost<any>(COMPANY_DISCOVERY_PATH, payload);
      const rawRows = extractArray(json);
      const rows = normalizeCompanyRows(rawRows);
      return { rows, source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    } catch (_) {
      return { rows: [], source: 'crustdata', creditCost: { provider: 'crustdata', estimated: 0 } };
    }
  },
};
