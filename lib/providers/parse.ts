// Lightweight parser to extract common people filters from freeform text.
// Intentionally conservative; improves over time.

import type { SearchQuery } from './types';

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function inferLocation(text: string): string | undefined {
  const t = normalizeText(text);
  if (/(^|\b)(sf|sfo|sfs|san francisco)(\b|$)/.test(t)) return 'San Francisco';
  if (/(^|\b)(nyc|new york)(\b|$)/.test(t)) return 'New York';
  if (/(^|\b)(bay area)(\b|$)/.test(t)) return 'Bay Area';
  if (/(^|\b)(seattle)(\b|$)/.test(t)) return 'Seattle';
  if (/(^|\b)(london)(\b|$)/.test(t)) return 'London';
  if (/(^|\b)(toronto)(\b|$)/.test(t)) return 'Toronto';
  return undefined;
}

function inferTitle(text: string): string | undefined {
  const t = normalizeText(text);
  // Simple role extraction based on common dev terms
  if (/software\s+developer|developer|software\s+engineer|engineer|frontend|backend/.test(t)) {
    // Return the most specific matching role
    if (/frontend/.test(t)) return 'frontend developer';
    if (/backend/.test(t)) return 'backend developer';
    if (/software\s+engineer/.test(t)) return 'software engineer';
    if (/software\s+developer/.test(t)) return 'software developer';
    if (/engineer/.test(t)) return 'engineer';
    if (/developer/.test(t)) return 'developer';
  }
  return undefined;
}

export function parsePeopleQuery(text: string, limit = 50): SearchQuery {
  const filters: Record<string, string | number | boolean> = {};
  const location = inferLocation(text);
  const title = inferTitle(text);
  if (location) filters.region = location;
  if (title) filters.title = title;

  return {
    q: text,
    filters: Object.keys(filters).length ? filters : undefined,
    limit,
  };
}

