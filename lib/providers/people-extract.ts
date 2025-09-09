import { parsePeopleQuery } from './parse';
import type { SearchQuery } from './types';
import { resolveRegion, resolveTitle } from './crustdata/client';

function sanitize(text: string): string {
  // Drop column/spec suffixes and extra punctuation the LLM sometimes adds
  return text.split('— columns:')[0].split('-- columns:')[0].trim();
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
  const filters: Record<string, any> = { ...(base.filters || {}) };

  // Title candidates from text; resolve to canonical if possible
  const titleList = inferTitles(raw);
  if (titleList.length) {
    // Resolve the first title to canonical; include the raw list as fallbacks
    const canonical = await resolveTitle(titleList[0]);
    const values = canonical ? [canonical, ...titleList] : titleList;
    // Use 'in' semantics via multiple conditions on the provider side (we map later if needed)
    filters.title = values.join('|'); // provider will split into multiple OR conditions
  }

  // Region canonicalization
  const regionText = (filters.region as string) || '';
  if (regionText) {
    const canonicalRegion = await resolveRegion(regionText);
    if (canonicalRegion) filters.region = canonicalRegion;
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
        filters.industry = val;
        break;
      case 'company':
        filters.company = val;
        break;
      case 'skills':
        filters.skills = val;
        break;
      case 'languages': {
        const langs = val.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
        if (langs.length) filters.languages = langs.join('|');
        break;
      }
      case 'min_connections': {
        const n = Number(val.replace(/[^0-9]/g, ''));
        if (!Number.isNaN(n)) filters.min_connections = n;
        break;
      }
      case 'size_range': {
        const mm = val.match(/(\d+|any)\s*[-–to]{1,3}\s*(\d+|any)/i);
        if (mm) {
          const lo = mm[1].toLowerCase() === 'any' ? undefined : Number(mm[1]);
          const hi = mm[2].toLowerCase() === 'any' ? undefined : Number(mm[2]);
          if (lo != null && !Number.isNaN(lo)) filters.employer_size_min = lo;
          if (hi != null && !Number.isNaN(hi)) filters.employer_size_max = hi;
        }
        break;
      }
      case 'experience': {
        // Map common buckets to a minimum years_of_experience_raw
        const t = val.toLowerCase();
        let min = 0;
        if (/less\s+than\s*1/.test(t)) min = 0;
        else if (/1\s*to\s*2/.test(t)) min = 1;
        else if (/3\s*to\s*5/.test(t)) min = 3;
        else if (/6\s*to\s*10/.test(t)) min = 6;
        else if (/more\s+than\s*10/.test(t)) min = 10;
        if (min > 0) filters.years_of_experience_raw_min = min;
        break;
      }
      default:
        break;
    }
  }

  // If we now have filters, drop q to avoid over-constraining
  const q = Object.keys(filters).length ? '' : raw;

  return { q, filters: Object.keys(filters).length ? filters : undefined, limit };
}
