import { parsePeopleQuery } from './parse';
import type { SearchQuery } from './types';
import { buildPeopleSearchQuery, type PeopleFilterSpec } from './crustdata/people-filters';

function sanitize(text: string): string {
  // Drop column/spec suffixes and extra punctuation the LLM sometimes adds
  return text.split('— columns:')[0].split('-- columns:')[0].trim();
}

function mergeStringList(
  existing: string | string[] | undefined,
  next: string[],
): string[] {
  const base = Array.isArray(existing)
    ? existing
    : existing
      ? [existing]
      : [];
  const combined = [...base, ...next]
    .map((value) => value.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of combined) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function inferTitles(text: string): string[] {
  const t = text.toLowerCase();
  const titles: string[] = [];
  if (/(chief\s+technology\s+officer|\bcto\b)/.test(t)) titles.push('CTO');
  if (/(vp\s+of\s+engineering|vice\s+president\s+of\s+engineering)/.test(t))
    titles.push('VP of Engineering');
  if (/director\s+of\s+engineering/.test(t)) titles.push('Director of Engineering');
  if (/tech\s*lead/.test(t)) titles.push('Tech Lead');
  if (/staff\s+engineer/.test(t)) titles.push('Staff Engineer');
  if (/principal\s+engineer/.test(t)) titles.push('Principal Engineer');
  if (/software\s+engineer|swe|sde/.test(t)) titles.push('Software Engineer');
  if (/software\s+developer/.test(t)) titles.push('Software Developer');
  if (/full\s*stack/.test(t)) titles.push('Full Stack Engineer');
  if (/frontend/.test(t)) titles.push('Frontend Engineer');
  if (/backend/.test(t)) titles.push('Backend Engineer');
  return Array.from(new Set(titles));
}

export async function buildPeopleQuery(
  text: string,
  limit = 50,
): Promise<SearchQuery> {
  const raw = sanitize(text);
  // Start with heuristic parse
  const base = parsePeopleQuery(raw, limit);
  const spec: PeopleFilterSpec = {};

  // Type guard to check if filters is a plain object (not CrustFilterNode)
  const baseFilters = base.filters as Record<string, any> | undefined;

  if (baseFilters && typeof baseFilters === 'object' && !('op' in baseFilters) && !('column' in baseFilters)) {
    if (baseFilters.region && typeof baseFilters.region === 'string') {
      spec.region = baseFilters.region;
    }

    if (baseFilters.title && typeof baseFilters.title === 'string') {
      spec.title = baseFilters.title;
    }

    if (baseFilters.company && typeof baseFilters.company === 'string') {
      spec.company = baseFilters.company;
    }

    if (baseFilters.industry && typeof baseFilters.industry === 'string') {
      const values = baseFilters.industry
        .split(/[,|]/)
        .map((value: string) => value.trim())
        .filter(Boolean);
      if (values.length) {
        spec.industry = mergeStringList(spec.industry, values);
      }
    }

    if (baseFilters.skills && typeof baseFilters.skills === 'string') {
      const initialSkills = mergeStringList(
        undefined,
        baseFilters.skills
          .split(/[,|]/)
          .map((value: string) => value.trim())
          .filter(Boolean),
      );
      if (initialSkills.length) {
        spec.skills = initialSkills.join(', ');
      }
    }

    if (baseFilters.languages && typeof baseFilters.languages === 'string') {
      const langs = baseFilters.languages
        .split(/[,|]/)
        .map((value: string) => value.trim())
        .filter(Boolean);
      if (langs.length) spec.languages = mergeStringList(undefined, langs);
    }
  }

  // Title candidates from text; resolve to canonical if possible
  const titleList = inferTitles(raw);
  if (titleList.length) {
    const uniqueTitles = Array.from(new Set(titleList));
    spec.title = spec.title
      ? [spec.title, ...uniqueTitles].flat()
      : uniqueTitles;
  }

  // Region canonicalization
  const regionText = spec.region || '';
  if (!regionText && baseFilters && typeof baseFilters === 'object' && !('op' in baseFilters) && !('column' in baseFilters)) {
    const inferredRegion = baseFilters.region as string | undefined;
    if (inferredRegion) spec.region = inferredRegion;
  }

  // Parse additional key:value hints if present in the text (from the UI card)
  // Supports: industry, company, skills, languages, min_connections, size_range (a-b), experience
  const parts = raw.split(/;|\n/).map((s) => s.trim());
  for (const part of parts) {
    const m = part.match(/^(\w[\w_ ]*):\s*(.+)$/i);
    if (!m) continue;
    const keyRaw = m[1].trim().toLowerCase();
    const val = m[2].trim();
    switch (keyRaw) {
      case 'industry':
        spec.industry = mergeStringList(spec.industry, [val]);
        break;
      case 'company':
        spec.company = val;
        break;
      case 'skills': {
        const skillTokens = val
          .split(/[,|]/)
          .map((value) => value.trim())
          .filter(Boolean);
        if (skillTokens.length) {
          const merged = mergeStringList(spec.skills, skillTokens);
          if (merged.length) spec.skills = merged.join(', ');
        }
        break;
      }
      case 'languages': {
        const langs = val.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
        if (langs.length) {
          const merged = mergeStringList(spec.languages, langs);
          if (merged.length) spec.languages = merged;
        }
        break;
      }
      case 'min_connections': {
        const n = Number(val.replace(/[^0-9]/g, ''));
        if (!Number.isNaN(n)) spec.minConnections = n;
        break;
      }
      case 'size_range': {
        const mm = val.match(/(\d+|any)\s*[-–to]{1,3}\s*(\d+|any)/i);
        if (mm) {
          const lo = mm[1].toLowerCase() === 'any' ? undefined : Number(mm[1]);
          const hi = mm[2].toLowerCase() === 'any' ? undefined : Number(mm[2]);
          if (lo != null && !Number.isNaN(lo)) spec.employerSizeMin = lo;
          if (hi != null && !Number.isNaN(hi)) spec.employerSizeMax = hi;
        }
        break;
      }
      case 'experience': {
        const t = val.toLowerCase();
        if (/less\s+than\s*1/.test(t)) spec.experienceBucket = 'Less than 1 year';
        else if (/1\s*to\s*2/.test(t)) spec.experienceBucket = '1 to 2 years';
        else if (/3\s*to\s*5/.test(t)) spec.experienceBucket = '3 to 5 years';
        else if (/6\s*to\s*10/.test(t)) spec.experienceBucket = '6 to 10 years';
        else if (/more\s+than\s*10/.test(t)) spec.experienceBucket = 'More than 10 years';
        break;
      }
      default:
        break;
    }
  }

  return buildPeopleSearchQuery(spec, limit, raw);
}
