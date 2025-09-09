// Lightweight parser to extract common people filters from freeform text.
// Intentionally conservative; improves over time.

import type { SearchQuery } from './types';

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function inferLocation(text: string): string | undefined {
  const t = normalizeText(text);
  if (/(san\s+francisco\s+bay\s+area|sf\s*bay\s*area|bay\s*area)/.test(t))
    return 'San Francisco Bay Area';
  if (/(^|\b)(sf|sfo|sfs|san francisco)(\b|$)/.test(t)) return 'San Francisco';
  if (/(washington[,\s-]*dc|\bdc\b|district of columbia)/.test(t))
    return 'Washington, District of Columbia';
  if (/(^|\b)(nyc|new york)(\b|$)/.test(t)) return 'New York';
  if (/(^|\b)(seattle)(\b|$)/.test(t)) return 'Seattle';
  if (/(^|\b)(london)(\b|$)/.test(t)) return 'London';
  if (/(^|\b)(toronto)(\b|$)/.test(t)) return 'Toronto';
  return undefined;
}

function inferTitle(text: string): string | undefined {
  const t = normalizeText(text);
  // Simple role extraction based on common dev terms
  if (
    /chief\s+technology\s+officer|\bcto\b|tech\s*lead|head\s+of\s+engineering|software\s+developer|developer|software\s+engineer|engineer|frontend|backend/.test(
      t,
    )
  ) {
    // Return the most specific matching role
    if (/chief\s+technology\s+officer|\bcto\b/.test(t)) return 'CTO';
    if (/head\s+of\s+engineering/.test(t)) return 'Head of Engineering';
    if (/tech\s*lead/.test(t)) return 'Tech Lead';
    if (/frontend/.test(t)) return 'frontend developer';
    if (/backend/.test(t)) return 'backend developer';
    if (/software\s+engineer/.test(t)) return 'software engineer';
    if (/software\s+developer/.test(t)) return 'software developer';
    if (/engineer/.test(t)) return 'engineer';
    if (/developer/.test(t)) return 'developer';
  }
  return undefined;
}

function inferCompany(text: string): string | undefined {
  const t = text.trim();
  // Patterns like: employees at Google, people at OpenAI, folks from Meta
  let m = t.match(/\b(?:employees|people|folks)\s+(?:at|from|of)\s+([A-Z][A-Za-z0-9&.'\- ]{1,60})\b/);
  if (m) return m[1].trim();
  // Patterns like: Google employees, OpenAI people
  m = t.match(/\b([A-Z][A-Za-z0-9&.'\- ]{1,60})\s+(?:employees|people|folks)\b/);
  if (m) return m[1].trim();
  // Patterns like: engineers at Google, title present but still capture company
  m = t.match(/\bat\s+([A-Z][A-Za-z0-9&.'\- ]{1,60})\b/);
  if (m) return m[1].trim();
  return undefined;
}

export function parsePeopleQuery(text: string, limit = 50): SearchQuery {
  const filters: Record<string, string | number | boolean> = {};
  const location = inferLocation(text);
  const title = inferTitle(text);
  const company = inferCompany(text);
  if (location) filters.region = location;
  if (title) filters.title = title;
  if (company) filters.company = company;

  return {
    q: text,
    filters: Object.keys(filters).length ? filters : undefined,
    limit,
  };
}

function inferIndustry(text: string): string | undefined {
  const t = normalizeText(text);
  if (/saas|software/i.test(t)) return 'Information Technology and Services';
  if (/fintech|financial/i.test(t)) return 'FinTech';
  if (/healthtech|health care|healthcare|medtech/i.test(t)) return 'Healthcare';
  if (/ai|artificial intelligence|machine learning/i.test(t)) return 'AI';
  if (/e[-\s]?commerce|retail/i.test(t)) return 'Retail';
  if (/marketing|adtech|advertis/i.test(t)) return 'Marketing & Advertising';
  return undefined;
}

function inferCountry(text: string): string | undefined {
  const t = normalizeText(text);
  if (/(^|\b)(usa|us|united states)(\b|$)/.test(t)) return 'United States';
  if (/(^|\b)(canada|ca)(\b|$)/.test(t)) return 'Canada';
  if (/(^|\b)(uk|united kingdom|england|london)(\b|$)/.test(t)) return 'United Kingdom';
  return undefined;
}

function inferSizeRange(text: string): { size_min?: number; size_max?: number } {
  const t = normalizeText(text);
  const m = t.match(/(\d{1,6})\s*[-–to]{1,3}\s*(\d{1,6})\s*(employees|people|headcount)?/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const [min, max] = a <= b ? [a, b] : [b, a];
    return { size_min: min, size_max: max };
  }
  const minMatch = t.match(/(at least|min(?:imum)?|over|>=?)\s*(\d{1,6})\s*(employees|people|headcount)?/i);
  if (minMatch) return { size_min: Number(minMatch[2]) };
  const maxMatch = t.match(/(at most|max(?:imum)?|under|<=?)\s*(\d{1,6})\s*(employees|people|headcount)?/i);
  if (maxMatch) return { size_max: Number(maxMatch[2]) };
  return {};
}

function inferYearFounded(text: string): { year_founded_min?: number; year_founded_max?: number } {
  const t = normalizeText(text);
  const after = t.match(/(after|since|post)\s*(\d{4})/i);
  if (after) return { year_founded_min: Number(after[2]) };
  const before = t.match(/(before|pre)\s*(\d{4})/i);
  if (before) return { year_founded_max: Number(before[2]) };
  return {};
}

export function parseCompanyQuery(text: string, limit = 100): SearchQuery {
  const filters: Record<string, string | number | boolean> = {};
  const industry = inferIndustry(text);
  const hq = inferLocation(text);
  const country = inferCountry(text);
  const size = inferSizeRange(text);
  const founded = inferYearFounded(text);

  if (industry) filters.industry = industry;
  if (hq) filters.hq = hq;
  if (country) filters.country = country;
  if (size.size_min != null) filters.size_min = size.size_min;
  if (size.size_max != null) filters.size_max = size.size_max;
  if (founded.year_founded_min != null)
    filters.year_founded_min = founded.year_founded_min;
  if (founded.year_founded_max != null)
    filters.year_founded_max = founded.year_founded_max;

  return {
    q: text,
    filters: Object.keys(filters).length ? filters : undefined,
    limit,
  };
}
