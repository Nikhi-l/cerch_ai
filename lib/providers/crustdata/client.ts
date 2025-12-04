/**
 * Improved CrustData API Client with:
 * - Request retry logic with exponential backoff
 * - Response caching for identical queries
 * - Credit checking before requests
 * - Better error messages
 * - Unified API patterns
 * - Rate limit handling
 */

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
  retryable: boolean;

  constructor(message: string, status?: number, body?: unknown, retryable = false) {
    super(message);
    this.name = 'CrustdataError';
    this.status = status;
    this.body = body;
    this.retryable = retryable;
  }
}

const API_BASE = process.env.CRUSTDATA_API_BASE || 'https://api.crustdata.com';
const PEOPLE_PATH = process.env.CRUSTDATA_PEOPLE_PATH || '/screener/persondb/search/';
const COMPANY_DISCOVERY_PATH =
  process.env.CRUSTDATA_COMPANY_SEARCH_PATH || '/screener/company/search';

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Caches for people and company searches
const peopleCache = new SimpleCache<ProviderResult<Person>>(5);
const companyCache = new SimpleCache<ProviderResult<Company>>(5);

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

/**
 * Check remaining Crustdata credits
 */
export async function getRemainingCredits(): Promise<number> {
  try {
    const data = await crustFetch<{ credits: number }>(`/user/credits`);
    return data.credits ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Check if user has sufficient credits
 */
async function checkCredits(minRequired: number = 1): Promise<void> {
  const credits = await getRemainingCredits();
  if (credits < minRequired) {
    throw new CrustdataError(
      `Insufficient Crustdata credits. You have ${credits} credits remaining. Please upgrade your plan or contact support.`,
      402, // Payment Required
      { credits },
      false
    );
  }
}

/**
 * Retry logic with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on auth errors or client errors (except 429)
      if (error instanceof CrustdataError) {
        if (!error.retryable || error.status === 401 || error.status === 403) {
          throw error;
        }
      }

      // Last attempt - throw the error
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
      const totalDelay = delay + jitter;

      dbg(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(totalDelay)}ms`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

async function crustFetch<T>(path: string): Promise<T> {
  return retryWithBackoff(async () => {
    const url = `${API_BASE}${path}`;
    const token = await getCrustToken();
    if (!token) {
      throw new CrustdataError(
        'Crustdata API token is not configured. Please add CRUSTDATA_API_TOKEN to your environment variables or set it in your account settings.',
        401,
        undefined,
        false
      );
    }
    const res = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: 'no-store',
      timeoutMs: 60000,
    });
    return await handleCrustResponse<T>(res);
  });
}

async function crustPost<T>(path: string, body: any): Promise<T> {
  return retryWithBackoff(async () => {
    const url = `${API_BASE}${path}`;
    const token = await getCrustToken();
    if (!token) {
      throw new CrustdataError(
        'Crustdata API token is not configured. Please add CRUSTDATA_API_TOKEN to your environment variables or set it in your account settings.',
        401,
        undefined,
        false
      );
    }
    // Log token presence (not value) for debugging
    console.log('[CRUSTDATA:CLIENT] Making POST request:', {
      url,
      hasToken: !!token,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 8) + '...',
    });
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
  });
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

    let userMessage: string;
    let isRetryable = false;

    switch (res.status) {
      case 401:
        userMessage = 'Oops! Something went wrong on our end. We\'re looking into it. Please check back later.';
        break;
      case 403:
        userMessage = 'Oops! Something went wrong on our end. Our team has been notified and we\'ll fix this soon. Please try again later.';
        break;
      case 402:
        userMessage = 'Oops! Something went wrong on our end. We\'re looking into it. Please check back later.';
        break;
      case 429:
        userMessage = 'Our systems are experiencing high load. Please wait a moment and try again.';
        isRetryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        userMessage = 'Oops! Something went wrong on our end. We\'re working on it. Please try again in a few minutes.';
        isRetryable = true;
        break;
      default:
        userMessage = 'Oops! Something unexpected happened. Our team has been notified. Please try again later.';
    }

    // Enhanced error logging with full details for debugging
    if (res.status === 401 || res.status === 403) {
      console.error('[CRUSTDATA:CLIENT] Authentication/Authorization Error:', {
        status: res.status,
        url: res.url,
        statusText: res.statusText,
        apiDetail: detail,
        fullPayload: payload,
        userMessage,
        hint: 'Check CRUSTDATA_API_TOKEN and account permissions/credits'
      });
    } else {
      console.error('[CRUSTDATA:CLIENT] API Error:', {
        status: res.status,
        url: res.url,
        statusText: res.statusText,
        apiDetail: detail,
        userMessage
      });
    }

    throw new CrustdataError(userMessage, res.status, payload, isRetryable);
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

/**
 * Improved filter building with validation and better structure
 */
function buildFilterNode(
  record: Record<string, string | number | boolean>,
  fallbackTerm: string,
): CrustFilterNode {
  const nodes: CrustFilterNode[] = [];

  for (const [key, raw] of Object.entries(record)) {
    if (raw === undefined || raw === null || raw === '') continue;

    try {
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
        case 'skills': {
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
          break;
        }
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
          // Unknown field - skip with warning
          dbg(`Unknown filter field: ${key}, skipping`);
      }
    } catch (error) {
      dbg(`Error processing filter field ${key}:`, error);
      // Continue processing other fields
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

/**
 * Generate cache key for queries
 */
function generateCacheKey(query: SearchQuery): string {
  return JSON.stringify({
    q: query.q,
    filters: query.filters,
    limit: query.limit,
    cursor: (query as any).cursor,
  });
}

// --- People enrichment (basic profile) ---
export async function enrichPeopleBasicProfile(linkedinUrls: string[]): Promise<any[]> {
  if (!Array.isArray(linkedinUrls) || linkedinUrls.length === 0) return [];

  // Check credits before enrichment (enrichment typically costs credits)
  await checkCredits(linkedinUrls.length);

  const param = encodeURIComponent(linkedinUrls.join(','));
  const path = `/screener/person/enrich/basic_profile?linkedin_profile_url=${param}`;
  try {
    const json = await crustFetch<any>(path);
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.error('[CRUSTDATA:CLIENT] enrichPeopleBasicProfile error', (e as any)?.message || e);
    throw e; // Re-throw to let caller handle
  }
}

export const crustPeopleProvider: PeopleProvider = {
  async getPeople(query: SearchQuery): Promise<ProviderResult<Person>> {
    try {
      // Check cache first
      const cacheKey = generateCacheKey(query);
      const cached = peopleCache.get(cacheKey);
      if (cached) {
        dbg('getPeople: returning cached result');
        return cached;
      }

      // Check credits before making request
      await checkCredits(10); // Estimate 10 credits per search

      const limit = query.limit ?? 50;
      const payload: any = { limit };
      const fallbackTerm = (query.q || '').trim();

      let filtersNode: CrustFilterNode | undefined;
      if (isCrustFilterNode(query.filters)) {
        filtersNode = query.filters as CrustFilterNode;
      } else if (query.filters && typeof query.filters === 'object') {
        filtersNode = buildFilterNode(
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
      dbg('getPeople: filters payload', JSON.stringify(payload.filters, null, 2));

      // Always log request details for debugging 403 errors
      console.log('[CRUSTDATA:CLIENT] getPeople request:', {
        url: `${API_BASE}${PEOPLE_PATH}`,
        limit: payload.limit,
        hasCursor: !!payload.cursor,
        filtersType: typeof payload.filters,
        filtersStructure: payload.filters,
      });

      const json = await crustPost<any>(PEOPLE_PATH, payload);
      const rawRows = Array.isArray(json?.profiles) ? json.profiles : extractArray(json);

      dbg('getPeople: response keys', Object.keys(json || {}));
      dbg('getPeople: raw rows count', rawRows.length);

      const rows = normalizePeopleRows(rawRows);
      dbg('getPeople: normalized rows', rows.length);

      const result: ProviderResult<Person> = {
        rows,
        nextCursor: json?.next_cursor ?? null,
        source: 'crustdata',
        creditCost: { provider: 'crustdata', estimated: Math.ceil(rows.length / 5) },
      };

      // Cache the result
      peopleCache.set(cacheKey, result);

      return result;
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
      // Check cache first
      const cacheKey = generateCacheKey(query);
      const cached = companyCache.get(cacheKey);
      if (cached) {
        dbg('getCompanies: returning cached result');
        return cached;
      }

      // Check credits before making request
      await checkCredits(10); // Estimate 10 credits per search

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
      else if (query.q) payload.gpt_prompt = query.q;

      dbg('getCompanies: POST', {
        path: COMPANY_DISCOVERY_PATH,
        page: payload.page,
        hasFilters: !!payload.filters,
        hasPrompt: !!payload.gpt_prompt,
        q: query.q ?? '',
      });

      // Always log request details for debugging 403 errors
      console.log('[CRUSTDATA:CLIENT] getCompanies request:', {
        url: `${API_BASE}${COMPANY_DISCOVERY_PATH}`,
        page: payload.page,
        hasFilters: !!payload.filters,
        hasPrompt: !!payload.gpt_prompt,
        filtersStructure: payload.filters,
        gptPrompt: payload.gpt_prompt,
      });

      const json = await crustPost<any>(COMPANY_DISCOVERY_PATH, payload);
      const rawRows = extractArray(json);

      dbg('getCompanies: response keys', Object.keys(json || {}));
      dbg('getCompanies: raw rows count', rawRows.length);

      const rows = normalizeCompanyRows(rawRows);
      dbg('getCompanies: normalized rows', rows.length);

      const result: ProviderResult<Company> = {
        rows,
        source: 'crustdata',
        creditCost: { provider: 'crustdata', estimated: Math.ceil(rows.length / 10) },
      };

      // Cache the result
      companyCache.set(cacheKey, result);

      return result;
    } catch (error: any) {
      const message = error instanceof CrustdataError ? error.message : error?.message || String(error);
      console.error('[CRUSTDATA:CLIENT] getCompanies: error', message);
      throw error;
    }
  },
};

/**
 * Clear all caches (useful for testing or manual refresh)
 */
export function clearCaches(): void {
  peopleCache.clear();
  companyCache.clear();
  dbg('All caches cleared');
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats() {
  return {
    people: {
      size: peopleCache.size(),
    },
    company: {
      size: companyCache.size(),
    },
  };
}
