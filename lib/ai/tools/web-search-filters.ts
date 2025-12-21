import { tool } from 'ai';
import { z } from 'zod';
import type { WebSearchSource, WebSearchGeolocation } from '@/lib/providers/types';

/**
 * Infer search sources based on the query content
 */
function inferSources(query: string): WebSearchSource[] {
  const lowerQuery = query.toLowerCase();

  // Check for news-related keywords
  const newsKeywords = ['news', 'latest', 'recent', 'announcement', 'update', 'breaking', 'today', 'yesterday', 'this week'];
  const hasNewsIntent = newsKeywords.some(kw => lowerQuery.includes(kw));

  // Check for academic/research keywords
  const scholarKeywords = ['research', 'paper', 'study', 'academic', 'journal', 'publication', 'scholar', 'thesis', 'dissertation', 'peer-reviewed'];
  const hasScholarIntent = scholarKeywords.some(kw => lowerQuery.includes(kw));

  // Check for author search
  const authorKeywords = ['author', 'professor', 'researcher', 'scientist', 'academic profile'];
  const hasAuthorIntent = authorKeywords.some(kw => lowerQuery.includes(kw));

  if (hasAuthorIntent) {
    return ['scholar-author'];
  }

  if (hasScholarIntent) {
    return ['scholar-articles'];
  }

  if (hasNewsIntent) {
    return ['news'];
  }

  // Default to web and news for general queries
  return ['web', 'news'];
}

/**
 * Infer geolocation from query content
 */
function inferGeolocation(query: string): WebSearchGeolocation | undefined {
  const lowerQuery = query.toLowerCase();

  const locationMap: Record<string, WebSearchGeolocation> = {
    // Countries
    'united states': 'US', 'usa': 'US', 'america': 'US',
    'canada': 'CA', 'canadian': 'CA',
    'uk': 'GB', 'united kingdom': 'GB', 'britain': 'GB', 'british': 'GB', 'england': 'GB',
    'germany': 'DE', 'german': 'DE',
    'france': 'FR', 'french': 'FR',
    'japan': 'JP', 'japanese': 'JP',
    'china': 'CN', 'chinese': 'CN',
    'india': 'IN', 'indian': 'IN',
    'australia': 'AU', 'australian': 'AU',
    'brazil': 'BR', 'brazilian': 'BR',
    // Cities (map to country)
    'san francisco': 'US', 'new york': 'US', 'silicon valley': 'US', 'los angeles': 'US', 'seattle': 'US', 'boston': 'US',
    'london': 'GB', 'manchester': 'GB',
    'berlin': 'DE', 'munich': 'DE',
    'paris': 'FR',
    'tokyo': 'JP',
    'shanghai': 'CN', 'beijing': 'CN',
    'mumbai': 'IN', 'bangalore': 'IN', 'delhi': 'IN',
    'sydney': 'AU', 'melbourne': 'AU',
    'toronto': 'CA', 'vancouver': 'CA',
    'singapore': 'SG',
  };

  for (const [location, code] of Object.entries(locationMap)) {
    if (lowerQuery.includes(location)) {
      return code;
    }
  }

  return undefined;
}

/**
 * Extract site restriction from query
 */
function extractSite(query: string): string | undefined {
  const lowerQuery = query.toLowerCase();

  // Common site patterns
  const sitePatterns = [
    { keywords: ['github', 'github.com'], site: 'github.com' },
    { keywords: ['linkedin', 'linkedin.com'], site: 'linkedin.com' },
    { keywords: ['twitter', 'x.com'], site: 'x.com' },
    { keywords: ['reddit', 'reddit.com'], site: 'reddit.com' },
    { keywords: ['hacker news', 'ycombinator', 'hn'], site: 'news.ycombinator.com' },
    { keywords: ['techcrunch'], site: 'techcrunch.com' },
    { keywords: ['verge'], site: 'theverge.com' },
    { keywords: ['arxiv'], site: 'arxiv.org' },
  ];

  for (const pattern of sitePatterns) {
    if (pattern.keywords.some(kw => lowerQuery.includes(kw))) {
      return pattern.site;
    }
  }

  // Check for explicit site: prefix
  const siteMatch = query.match(/site:([^\s]+)/i);
  if (siteMatch) {
    return siteMatch[1];
  }

  return undefined;
}

/**
 * Clean query by removing inferred parameters
 */
function cleanQuery(query: string): string {
  // Remove site: prefix if present
  let cleaned = query.replace(/site:[^\s]+/gi, '').trim();

  // Remove explicit source indicators that we've already processed
  const removePatterns = [
    /\b(on|from|in)\s+(github|linkedin|twitter|reddit|hacker news|techcrunch)\b/gi,
    /\bnews\s+about\b/gi,
    /\bresearch\s+papers?\s+(on|about)\b/gi,
  ];

  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned || query; // Fallback to original if cleaning removes everything
}

export const webSearchFiltersTool = tool({
  description:
    'Present a UI card to refine web search parameters before executing. Use when the user asks to search the web, find news, research articles, or discover information online.',
  parameters: z.object({
    initialQuery: z
      .string()
      .describe('User search query, e.g. "latest AI news" or "research papers on machine learning"'),
  }),
  execute: async ({ initialQuery }) => {
    // Infer search parameters from the query
    const inferredSources = inferSources(initialQuery);
    const inferredGeolocation = inferGeolocation(initialQuery);
    const inferredSite = extractSite(initialQuery);
    const cleanedQuery = cleanQuery(initialQuery);

    return {
      baseQuery: cleanedQuery,
      originalQuery: initialQuery,
      inferredFilters: {
        sources: inferredSources,
        geolocation: inferredGeolocation,
        site: inferredSite,
      },
      hint: {
        sources: inferredSources,
        geolocation: inferredGeolocation || 'US', // Default to US if not inferred
        site: inferredSite,
      },
    } as const;
  },
});
