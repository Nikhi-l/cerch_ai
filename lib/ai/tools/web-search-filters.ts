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
 * Detect GitHub profile search intent
 */
function isGitHubProfileSearch(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const githubKeywords = ['github', 'github profile', 'github.com'];
  const profileKeywords = ['profile', 'developer', 'programmer', 'contributor', 'repo', 'repository', 'open source'];

  const hasGitHub = githubKeywords.some(kw => lowerQuery.includes(kw));
  const hasProfileIntent = profileKeywords.some(kw => lowerQuery.includes(kw));

  // Direct GitHub profile search
  if (hasGitHub) return true;

  // Implicit developer search that would benefit from GitHub
  if (hasProfileIntent && (lowerQuery.includes('find') || lowerQuery.includes('search'))) {
    return true;
  }

  return false;
}

/**
 * Extract site restriction from query
 * Returns in format "site:domain.com" as required by CrustData API
 */
function extractSite(query: string): string | undefined {
  const lowerQuery = query.toLowerCase();

  // Common site patterns - value is the domain for site restriction
  const sitePatterns = [
    { keywords: ['github profile', 'github developer', 'github user'], site: 'site:github.com' },
    { keywords: ['github', 'github.com'], site: 'site:github.com' },
    { keywords: ['linkedin profile', 'linkedin'], site: 'site:linkedin.com' },
    { keywords: ['twitter', 'x.com'], site: 'site:x.com' },
    { keywords: ['reddit', 'reddit.com'], site: 'site:reddit.com' },
    { keywords: ['hacker news', 'ycombinator', 'hn'], site: 'site:news.ycombinator.com' },
    { keywords: ['techcrunch'], site: 'site:techcrunch.com' },
    { keywords: ['verge'], site: 'site:theverge.com' },
    { keywords: ['arxiv'], site: 'site:arxiv.org' },
    { keywords: ['stack overflow', 'stackoverflow'], site: 'site:stackoverflow.com' },
    { keywords: ['medium'], site: 'site:medium.com' },
    { keywords: ['dev.to'], site: 'site:dev.to' },
  ];

  for (const pattern of sitePatterns) {
    if (pattern.keywords.some(kw => lowerQuery.includes(kw))) {
      return pattern.site;
    }
  }

  // Check for explicit site: prefix (already formatted)
  const siteMatch = query.match(/site:([^\s]+)/i);
  if (siteMatch) {
    return `site:${siteMatch[1]}`;
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
    /\bgithub\s+(profile|developer|user|repo|repository)s?\b/gi,
    /\bfind\s+(github|developer|programmer)\b/gi,
    /\bsearch\s+(github|developer|programmer)\b/gi,
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

/**
 * Determine if this is a profile search (GitHub, LinkedIn, etc.)
 */
function isProfileSearch(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const profileKeywords = [
    'github', 'linkedin', 'profile', 'developer profile',
    'find developer', 'search developer', 'programmer',
    'open source contributor', 'github user'
  ];
  return profileKeywords.some(kw => lowerQuery.includes(kw));
}

export const webSearchFiltersTool = tool({
  description:
    'Present a UI card to refine web search parameters before executing. Use when the user asks to search the web, find news, research articles, discover information online, or find GitHub profiles/developers.',
  parameters: z.object({
    initialQuery: z
      .string()
      .describe('User search query, e.g. "latest AI news", "research papers on machine learning", or "Tyler Lambe Github"'),
  }),
  execute: async ({ initialQuery }) => {
    // Infer search parameters from the query
    const inferredSources = inferSources(initialQuery);
    const inferredGeolocation = inferGeolocation(initialQuery);
    const inferredSite = extractSite(initialQuery);
    const cleanedQuery = cleanQuery(initialQuery);

    // Determine search type for specialized handling
    const isGitHub = isGitHubProfileSearch(initialQuery);
    const isProfile = isProfileSearch(initialQuery);
    const searchType = isGitHub ? 'github-profile' : isProfile ? 'profile' : 'general';

    return {
      baseQuery: cleanedQuery,
      originalQuery: initialQuery,
      searchType,
      inferredFilters: {
        sources: inferredSources,
        geolocation: inferredGeolocation,
        site: inferredSite,
      },
      hint: {
        sources: inferredSources,
        geolocation: inferredGeolocation || 'US', // Default to US if not inferred
        site: inferredSite,
        searchType,
      },
    } as const;
  },
});
