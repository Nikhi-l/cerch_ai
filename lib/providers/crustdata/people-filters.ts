import { parsePeopleQuery } from '../parse';
import type {
  CrustFilterCondition,
  CrustFilterNode,
  SearchQuery,
} from '../types';

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

function condition(
  column: string,
  type: CrustFilterCondition['type'],
  value: CrustFilterCondition['value'],
): CrustFilterCondition {
  return { column, type, value };
}

function asAndGroup(conditions: CrustFilterNode[]): CrustFilterNode | undefined {
  if (!conditions.length) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { op: 'and', conditions };
}

const TEXT_SEARCH_COLUMNS = [
  'headline',
  'summary',
  'skills',
  'current_employers.title',
  'current_employers.name',
  'name',
];

function buildTextGroup(rawTerm: string): CrustFilterNode | undefined {
  const term = rawTerm.trim();
  if (!term) return undefined;
  const conditions = TEXT_SEARCH_COLUMNS.map((column) =>
    condition(column, '(.)', term),
  );
  return { op: 'or', conditions };
}

function stripKeyValuePairs(text: string): string {
  return text.replace(
    /(title|industry|company|skills|languages|min_connections|size_range|experience)[\s:]+[^;\n]+/gi,
    ' ',
  );
}

function extractKeywords(baseText: string, spec: PeopleFilterSpec): string[] {
  const cleaned = stripKeyValuePairs(baseText)
    .replace(/["'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  const fragments = cleaned
    .split(/[,;/]|\band\b|\bor\b|\n/gi)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 2);

  const candidates = fragments.length ? fragments : [cleaned];
  const taken = new Set(
    uniqueStrings(
      [
        ...(toArray(spec.title) || []),
        spec.company || '',
        spec.region || '',
        spec.skills || '',
        ...(toArray(spec.industry) || []),
      ].filter(Boolean) as string[],
    ).map((value) => value.toLowerCase()),
  );

  return uniqueStrings(
    candidates.filter((candidate) => !taken.has(candidate.toLowerCase())),
  ).slice(0, 3);
}

export function buildPeopleSearchQuery(
  spec: PeopleFilterSpec,
  limit = 50,
  baseQuery?: string,
): SearchQuery {
  const sanitizedQuery = (baseQuery || '')
    .split('— columns:')[0]
    .split('-- columns:')[0]
    .trim();

  const parsed = sanitizedQuery ? parsePeopleQuery(sanitizedQuery, limit) : undefined;
  const combined: PeopleFilterSpec = { ...spec };

  if (parsed?.filters) {
    const pf = parsed.filters as Record<string, string>;
    if (!combined.region && typeof pf.region === 'string') combined.region = pf.region;
    if (!combined.title && typeof pf.title === 'string') combined.title = pf.title;
    if (!combined.company && typeof pf.company === 'string') combined.company = pf.company;
  }

  const conditions: CrustFilterNode[] = [];

  const titles = toArray(combined.title);
  if (titles?.length) {
    const distinctTitles = uniqueStrings(titles);
    const titleConditions = distinctTitles.map((title) =>
      condition('current_employers.title', '(.)', title),
    );
    conditions.push(
      titleConditions.length === 1
        ? titleConditions[0]
        : ({ op: 'or', conditions: titleConditions } as CrustFilterNode),
    );
  }

  if (combined.company) {
    conditions.push(condition('current_employers.name', '(.)', combined.company));
  }

  if (combined.region) {
    conditions.push(condition('region', '(.)', combined.region));
  }

  const skillTerms = combined.skills
    ? combined.skills
        .split(/[,|]/)
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  if (skillTerms.length) {
    const skillConditions = uniqueStrings(skillTerms).map((skill) =>
      condition('skills', '(.)', skill),
    );
    conditions.push(
      skillConditions.length === 1
        ? skillConditions[0]
        : ({ op: 'or', conditions: skillConditions } as CrustFilterNode),
    );
  }

  const languages = toArray(combined.languages);
  if (languages?.length) {
    conditions.push(condition('languages', 'in', uniqueStrings(languages)));
  }

  const industries = toArray(combined.industry);
  if (industries?.length) {
    const industryConditions = uniqueStrings(industries).map((industry) =>
      condition('all_employers.company_industries', '(.)', industry),
    );
    conditions.push(
      industryConditions.length === 1
        ? industryConditions[0]
        : ({ op: 'or', conditions: industryConditions } as CrustFilterNode),
    );
  }

  const minConn = toNumber(combined.minConnections);
  if (minConn != null) {
    conditions.push(condition('num_of_connections', '=>', minConn));
  }

  const expMin = mapExperience(combined.experienceBucket);
  if (expMin != null) {
    conditions.push(condition('years_of_experience_raw', '=>', expMin));
  }

  const sizeMin = toNumber(combined.employerSizeMin);
  if (sizeMin != null) {
    conditions.push(
      condition('current_employers.company_headcount_latest', '=>', sizeMin),
    );
  }

  const sizeMax = toNumber(combined.employerSizeMax);
  if (sizeMax != null) {
    conditions.push(
      condition('current_employers.company_headcount_latest', '=<', sizeMax),
    );
  }

  const keywords = sanitizedQuery ? extractKeywords(sanitizedQuery, combined) : [];
  for (const keyword of keywords) {
    const textGroup = buildTextGroup(keyword);
    if (textGroup) conditions.push(textGroup);
  }

  if (!conditions.length && sanitizedQuery) {
    const fallback = buildTextGroup(sanitizedQuery);
    if (fallback) conditions.push(fallback);
  }

  const filtersNode = asAndGroup(conditions);
  const finalFilters =
    filtersNode ??
    condition('headline', '(.)', 'engineer');

  return {
    filters: finalFilters,
    limit,
  };
}
