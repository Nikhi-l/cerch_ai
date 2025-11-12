/**
 * Improved Company Artifact Handler with:
 * - Progressive CSV streaming
 * - Better status updates
 * - Credit checking
 * - Enhanced error handling
 */

import { createDocumentHandler } from '@/lib/artifacts/server';
import { aggregateCompanies } from '@/lib/providers';
import {
  crustCompanyProvider,
  isCrustConfigured,
  getRemainingCredits,
} from '@/lib/providers/crustdata/client';
import { toCSV } from '@/lib/providers/normalize';
import { parseCompanyQuery } from '@/lib/providers/parse';

function debugEnabled() {
  return process.env.DEBUG_CRUSTDATA === 'true';
}

function dbg(...args: any[]) {
  if (debugEnabled()) console.log('[CRUSTDATA:COMPANY]', ...args);
}

/**
 * Stream CSV rows progressively
 */
function streamCSVRows(
  headers: string[],
  rows: any[],
  dataStream: any,
  chunkSize: number = 10
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
        content: `Processed ${Math.min(i + chunkSize, rows.length)} of ${rows.length} companies...`,
      });
    }
  }

  return csvLines.join('\n');
}

export const companyDocumentHandler = createDocumentHandler<'company'>({
  kind: 'company',
  onCreateDocument: async ({ title, dataStream }) => {
    try {
      // Step 1: Initialize
      dataStream.writeData({
        type: 'status',
        content: 'Initializing company search...',
      });

      if (!(await isCrustConfigured())) {
        const errorMsg =
          'Crustdata API is not configured. Please add your API token in Settings → API Keys.';
        dataStream.writeData({ type: 'error', content: errorMsg });
        throw new Error(errorMsg);
      }

      // Step 2: Check credits
      dataStream.writeData({
        type: 'status',
        content: 'Checking available credits...',
      });

      const credits = await getRemainingCredits();
      dbg('onCreateDocument: available credits', credits);

      if (credits < 10) {
        const warningMsg = `Low credits (${credits} remaining). Search may be limited.`;
        dataStream.writeData({ type: 'status', content: warningMsg });
      } else {
        dataStream.writeData({
          type: 'status',
          content: `Credits available: ${credits}`,
        });
      }

      // Step 3: Parse query
      dataStream.writeData({
        type: 'status',
        content: 'Analyzing company search criteria...',
      });

      const query = parseCompanyQuery(title, 50);
      dbg('onCreateDocument: parsed query', { title, query });

      // Step 4: Show search parameters
      const filterDescription = [];
      if (query.filters) {
        const filters = query.filters as any;
        if (filters.industry) filterDescription.push(`Industry: ${filters.industry}`);
        if (filters.hq || filters.location || filters.country) {
          filterDescription.push(`Location: ${filters.hq || filters.location || filters.country}`);
        }
        if (filters.size_min || filters.size_max) {
          const sizeRange = `${filters.size_min || 0}-${filters.size_max || '∞'}`;
          filterDescription.push(`Size: ${sizeRange} employees`);
        }
      }

      if (filterDescription.length > 0) {
        dataStream.writeData({
          type: 'status',
          content: `Searching for: ${filterDescription.join(', ')}`,
        });
      }

      // Step 5: Execute search
      dataStream.writeData({
        type: 'status',
        content: 'Scanning company databases...',
      });

      const result = await aggregateCompanies(query, [crustCompanyProvider]);
      dbg('onCreateDocument: provider result count', result.rows.length);

      // Step 6: Handle results
      if (result.rows.length === 0) {
        const message =
          'No companies matched your criteria. Try:\n• Broadening the industry\n• Expanding the location\n• Adjusting size ranges';
        dataStream.writeData({ type: 'error', content: message });
        throw new Error(message);
      }

      dataStream.writeData({
        type: 'status',
        content: `Found ${result.rows.length} matching companies. Preparing list...`,
      });

      // Step 7: Stream CSV progressively
      const headers = [
        'name',
        'industry',
        'company_url',
        'linkedin_url',
        'location',
        'size',
        'funding',
        'logo_url',
        'description',
        'tags',
      ];

      dbg('onCreateDocument: streaming CSV progressively');

      const csv = streamCSVRows(headers, result.rows as any[], dataStream, 10);
      dbg('onCreateDocument: total CSV length', csv.length);

      // Step 8: Final status
      dataStream.writeData({
        type: 'status',
        content: `✓ Successfully loaded ${result.rows.length} companies`,
      });

      // Show remaining credits
      if (result.creditCost) {
        const remainingCredits = await getRemainingCredits();
        dataStream.writeData({
          type: 'status',
          content: `Credits remaining: ${remainingCredits}`,
        });
      }

      return csv;
    } catch (error: any) {
      dbg('onCreateDocument: error', error?.message || error);
      throw error;
    }
  },

  onUpdateDocument: async ({ document, description, dataStream }) => {
    try {
      // Step 1: Initialize
      dataStream.writeData({
        type: 'status',
        content: 'Updating company search...',
      });

      if (!(await isCrustConfigured())) {
        const errorMsg =
          'Crustdata API is not configured. Please add your API token in Settings → API Keys.';
        dataStream.writeData({ type: 'error', content: errorMsg });
        throw new Error(errorMsg);
      }

      // Step 2: Check credits
      const credits = await getRemainingCredits();
      dbg('onUpdateDocument: available credits', credits);

      if (credits < 10) {
        const warningMsg = `Low credits (${credits} remaining).`;
        dataStream.writeData({ type: 'status', content: warningMsg });
      }

      // Step 3: Parse updated query
      dataStream.writeData({
        type: 'status',
        content: 'Analyzing updated criteria...',
      });

      const text = description || document.title;
      const query = parseCompanyQuery(text, 50);
      dbg('onUpdateDocument: parsed query', { text, query });

      // Step 4: Execute search
      dataStream.writeData({
        type: 'status',
        content: 'Searching with updated criteria...',
      });

      const result = await aggregateCompanies(query, [crustCompanyProvider]);
      dbg('onUpdateDocument: provider result count', result.rows.length);

      // Step 5: Handle results
      if (result.rows.length === 0) {
        const message = 'No companies matched your updated criteria. Try less restrictive filters.';
        dataStream.writeData({ type: 'error', content: message });
        throw new Error(message);
      }

      dataStream.writeData({
        type: 'status',
        content: `Found ${result.rows.length} companies with updated criteria...`,
      });

      // Step 6: Stream updated CSV
      const headers = [
        'name',
        'industry',
        'company_url',
        'linkedin_url',
        'location',
        'size',
        'funding',
        'logo_url',
        'description',
        'tags',
      ];

      const csv = streamCSVRows(headers, result.rows as any[], dataStream, 10);
      dbg('onUpdateDocument: streamed CSV length', csv.length);

      // Step 7: Final status
      dataStream.writeData({
        type: 'status',
        content: `✓ Updated with ${result.rows.length} companies`,
      });

      return csv;
    } catch (error: any) {
      dbg('onUpdateDocument: error', error?.message || error);
      throw error;
    }
  },
});
