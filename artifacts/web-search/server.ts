/**
 * Web Search Artifact Handler
 * - Executes web searches via CrustData Web Search API
 * - Displays search results in a tabular format
 * - Supports news, web, and scholar sources
 */

import { createDocumentHandler } from '@/lib/artifacts/server';
import {
  crustWebSearchProvider,
  isCrustConfigured,
} from '@/lib/providers/crustdata/client';
import type { WebSearchSource } from '@/lib/providers/types';
import { deductUserCredits, getRemainingUserCredits } from '@/lib/db/queries';

function debugEnabled() {
  return process.env.DEBUG_CRUSTDATA === 'true';
}

function dbg(...args: any[]) {
  if (debugEnabled()) console.log('[CRUSTDATA:WEB-SEARCH]', ...args);
}

/**
 * Parse search parameters from title/query
 * Format: "query | sources:news,web | geo:US | site:github.com"
 * Note: CrustData API expects site in format "site:domain.com"
 */
function parseSearchParams(title: string): {
  query: string;
  sources?: WebSearchSource[];
  geolocation?: string;
  site?: string;
} {
  const parts = title.split('|').map(p => p.trim());
  const query = parts[0] || title;

  let sources: WebSearchSource[] | undefined;
  let geolocation: string | undefined;
  let site: string | undefined;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('sources:')) {
      const sourceStr = part.substring(8).trim();
      sources = sourceStr.split(',').map(s => s.trim()) as WebSearchSource[];
    } else if (part.startsWith('geo:')) {
      geolocation = part.substring(4).trim();
    } else if (part.startsWith('site:')) {
      // Keep the full "site:domain.com" format for CrustData API
      // If it's "site:site:domain.com" (double prefix), normalize it
      const siteValue = part.trim();
      if (siteValue.startsWith('site:site:')) {
        site = siteValue.substring(5); // Remove one "site:" to get "site:domain.com"
      } else {
        site = siteValue; // Already in correct format "site:domain.com"
      }
    }
  }

  return { query, sources, geolocation, site };
}

/**
 * Stream CSV rows progressively for better UX
 */
function streamCSVRows(
  headers: string[],
  rows: any[],
  dataStream: any,
  chunkSize = 5
): string {
  const csvLines: string[] = [headers.join(',')];

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const chunkLines = chunk.map(row => {
      return headers.map(h => {
        const value = row[h] ?? '';
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
          ? `"${escaped}"`
          : escaped;
      }).join(',');
    });

    csvLines.push(...chunkLines);

    const partialCSV = csvLines.join('\n');
    dataStream.writeData({ type: 'sheet-delta', content: partialCSV });

    if (i + chunkSize < rows.length) {
      dataStream.writeData({
        type: 'status',
        content: `Processed ${Math.min(i + chunkSize, rows.length)} of ${rows.length} results...`,
      });
    }
  }

  return csvLines.join('\n');
}

/**
 * Generate demo search results for testing without API
 */
function getDemoResults(query: string): any[] {
  const demoData = [
    {
      title: 'Example AI Research Paper - Nature',
      url: 'https://www.nature.com/articles/example',
      snippet: `Research paper discussing ${query} and its implications for the future of technology.`,
      source: 'web',
      position: 1,
    },
    {
      title: `${query} - Latest News and Updates | TechCrunch`,
      url: 'https://techcrunch.com/example-article',
      snippet: `Breaking news: Major developments in ${query} announced today by leading companies.`,
      source: 'news',
      position: 2,
    },
    {
      title: `Understanding ${query}: A Comprehensive Guide`,
      url: 'https://www.example.com/guide',
      snippet: `This guide covers everything you need to know about ${query}, from basics to advanced topics.`,
      source: 'web',
      position: 3,
    },
    {
      title: `${query} Market Analysis 2025 | Forbes`,
      url: 'https://www.forbes.com/analysis',
      snippet: `Industry analysts predict significant growth in ${query} sector over the next five years.`,
      source: 'news',
      position: 4,
    },
    {
      title: `Academic Study: Impact of ${query} on Society`,
      url: 'https://scholar.google.com/example',
      snippet: `Peer-reviewed research examining the social and economic effects of ${query}.`,
      source: 'scholar-articles',
      position: 5,
    },
  ];

  return demoData;
}

export const webSearchDocumentHandler = createDocumentHandler<'web-search'>({
  kind: 'web-search',
  onCreateDocument: async ({ title, dataStream, session }) => {
    try {
      // Step 1: Check user credits (1 credit for web search)
      dataStream.writeData({
        type: 'status',
        content: 'Checking your credits...',
      });

      const requiredCredits = 1;
      const remainingCredits = await getRemainingUserCredits({ userId: session.user.id });
      dbg('onCreateDocument: user credits', { remaining: remainingCredits, required: requiredCredits });

      if (remainingCredits < requiredCredits) {
        const errorMsg = `Insufficient credits. You have ${remainingCredits} credits remaining, but ${requiredCredits} is required. Please upgrade your plan to continue.`;
        dataStream.writeData({ type: 'error', content: errorMsg });
        dataStream.writeData({ type: 'finish', content: '' });
        const errorCsv = `ERROR\n"${errorMsg.replace(/"/g, '""')}"`;
        return errorCsv;
      }

      dataStream.writeData({
        type: 'status',
        content: `Credits: ${remainingCredits} available`,
      });

      // Step 2: Parse search parameters
      const params = parseSearchParams(title);
      dbg('onCreateDocument: parsed params', params);

      dataStream.writeData({
        type: 'status',
        content: 'Preparing web search...',
      });

      // Step 3: Check configuration and run search
      let rows: any[];
      let isDemoMode = false;

      if (!(await isCrustConfigured())) {
        dataStream.writeData({
          type: 'status',
          content: 'Running in demo mode (configure CrustData API for live results)...',
        });

        // Use demo data
        rows = getDemoResults(params.query);
        isDemoMode = true;

        // Simulate network delay for realistic feel
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        dataStream.writeData({
          type: 'status',
          content: 'Searching the web...',
        });

        const result = await crustWebSearchProvider.search({
          query: params.query,
          sources: params.sources,
          geolocation: params.geolocation as any,
          site: params.site,
        });

        dbg('onCreateDocument: search result', { rowCount: result.rows.length });
        rows = result.rows;
      }

      // Step 4: Handle results
      if (rows.length === 0) {
        const message = 'No results found for your search. Try:\n• Using different keywords\n• Removing site restrictions\n• Expanding the search scope';
        dataStream.writeData({ type: 'error', content: message });
        dataStream.writeData({ type: 'finish', content: '' });
        const errorCsv = `ERROR\n"${message.replace(/"/g, '""')}"`;
        return errorCsv;
      }

      dataStream.writeData({
        type: 'status',
        content: `Found ${rows.length} results. Preparing display...`,
      });

      // Step 5: Prepare and stream CSV
      const headers = ['title', 'url', 'snippet', 'source', 'position'];

      dbg('onCreateDocument: streaming CSV progressively');
      const csv = streamCSVRows(headers, rows, dataStream, 5);
      dbg('onCreateDocument: total CSV length', csv.length);

      // Step 6: Deduct credits (only for live searches)
      if (!isDemoMode) {
        await deductUserCredits({ userId: session.user.id, amount: requiredCredits });
        dbg('onCreateDocument: deducted credits', requiredCredits);
      }

      const newRemainingCredits = await getRemainingUserCredits({ userId: session.user.id });

      // Step 7: Final status
      dataStream.writeData({
        type: 'status',
        content: `✓ Found ${rows.length} web results${isDemoMode ? ' (demo mode)' : ''}`,
      });

      dataStream.writeData({
        type: 'status',
        content: `Credits remaining: ${newRemainingCredits}`,
      });

      return csv;
    } catch (error: any) {
      dbg('onCreateDocument: error', error?.message || error);

      const userMessage = error?.message || 'Oops! Something went wrong with the web search. Please try again later.';
      dataStream.writeData({ type: 'error', content: userMessage });
      dataStream.writeData({ type: 'finish', content: '' });

      const errorCsv = `ERROR\n"${userMessage.replace(/"/g, '""')}"`;
      return errorCsv;
    }
  },

  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    try {
      // Step 1: Check user credits
      dataStream.writeData({
        type: 'status',
        content: 'Checking your credits...',
      });

      const requiredCredits = 1;
      const remainingCredits = await getRemainingUserCredits({ userId: session.user.id });

      if (remainingCredits < requiredCredits) {
        const errorMsg = `Insufficient credits. You have ${remainingCredits} credits remaining.`;
        dataStream.writeData({ type: 'error', content: errorMsg });
        dataStream.writeData({ type: 'finish', content: '' });
        return document.content || '';
      }

      // Step 2: Parse new search parameters
      const searchText = description || document.title;
      const params = parseSearchParams(searchText);

      dataStream.writeData({
        type: 'status',
        content: 'Updating search...',
      });

      // Step 3: Execute updated search
      let rows: any[];
      let isDemoMode = false;

      if (!(await isCrustConfigured())) {
        rows = getDemoResults(params.query);
        isDemoMode = true;
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        const result = await crustWebSearchProvider.search({
          query: params.query,
          sources: params.sources,
          geolocation: params.geolocation as any,
          site: params.site,
        });
        rows = result.rows;
      }

      // Step 4: Handle results
      if (rows.length === 0) {
        const message = 'No results found for your updated search.';
        dataStream.writeData({ type: 'error', content: message });
        dataStream.writeData({ type: 'finish', content: '' });
        return document.content || '';
      }

      dataStream.writeData({
        type: 'status',
        content: `Found ${rows.length} results...`,
      });

      // Step 5: Stream updated CSV
      const headers = ['title', 'url', 'snippet', 'source', 'position'];
      const csv = streamCSVRows(headers, rows, dataStream, 5);

      // Step 6: Deduct credits (only for live searches)
      if (!isDemoMode) {
        await deductUserCredits({ userId: session.user.id, amount: requiredCredits });
      }

      const newRemainingCredits = await getRemainingUserCredits({ userId: session.user.id });

      dataStream.writeData({
        type: 'status',
        content: `✓ Updated with ${rows.length} results`,
      });

      dataStream.writeData({
        type: 'status',
        content: `Credits remaining: ${newRemainingCredits}`,
      });

      return csv;
    } catch (error: any) {
      dbg('onUpdateDocument: error', error?.message || error);

      const userMessage = error?.message || 'Failed to update search results. Please try again.';
      dataStream.writeData({ type: 'error', content: userMessage });
      dataStream.writeData({ type: 'finish', content: '' });

      return document.content || '';
    }
  },
});
