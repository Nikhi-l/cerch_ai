import type { SearchQuery } from '../types';

export type ExperienceBucket =
  | 'Less than 1 year'
  | '1 to 2 years'
  | '3 to 5 years'
  | '6 to 10 years'
  | 'More than 10 years';

export type PeopleFilterSpec = {
  region?: string;
  title?: string | string[];
  company?: string;
  skills?: string;
  languages?: string | string[];
  minConnections?: number | string;
  experienceBucket?: ExperienceBucket;
  employerSizeMin?: number | string;
  employerSizeMax?: number | string;
  industry?: string | string[];
};

function toArray(val?: string | string[]): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.filter(Boolean).map((s) => s.trim()).filter(Boolean);
  // split by comma or pipe
  return val
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toJoined(val?: string | string[]): string | undefined {
  const arr = toArray(val);
  if (!arr || arr.length === 0) return undefined;
  return arr.join('|');
}

function toNumber(n?: number | string): number | undefined {
  if (n == null || n === '') return undefined;
  if (typeof n === 'number') return n;
  const parsed = Number(String(n).replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapExperience(bucket?: ExperienceBucket): number | undefined {
  switch (bucket) {
    case 'Less than 1 year':
      return 0;
    case '1 to 2 years':
      return 1;
    case '3 to 5 years':
      return 3;
    case '6 to 10 years':
      return 6;
    case 'More than 10 years':
      return 10;
    default:
      return undefined;
  }
}

export function buildPeopleSearchQuery(
  spec: PeopleFilterSpec,
  limit = 50,
  baseQuery?: string,
): SearchQuery {
  // Map UI spec → provider-friendly SearchQuery.filters
  const filters: Record<string, string | number | boolean> = {};

  if (spec.region) filters.region = String(spec.region);

  const titlesJoined = toJoined(spec.title);
  if (titlesJoined) filters.title = titlesJoined; // provider splits on '|'

  if (spec.company) filters.company = String(spec.company);

  if (spec.skills) filters.skills = String(spec.skills);

  const languagesJoined = toJoined(spec.languages);
  if (languagesJoined) filters.languages = languagesJoined; // provider splits to array

  const minConn = toNumber(spec.minConnections);
  if (minConn != null) filters.min_connections = minConn;

  const expMin = mapExperience(spec.experienceBucket);
  if (expMin != null) filters.years_of_experience_raw_min = expMin;

  const sizeMin = toNumber(spec.employerSizeMin);
  if (sizeMin != null) filters.employer_size_min = sizeMin;

  const sizeMax = toNumber(spec.employerSizeMax);
  if (sizeMax != null) filters.employer_size_max = sizeMax;

  const industryJoined = toJoined(spec.industry);
  if (industryJoined) filters.industry = industryJoined;

  const hasFilters = Object.keys(filters).length > 0;

  return {
    q: hasFilters ? '' : (baseQuery || ''),
    filters: hasFilters ? filters : undefined,
    limit,
  };
}

