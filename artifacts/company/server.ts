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
} from '@/lib/providers/crustdata/client';
import { toCSV } from '@/lib/providers/normalize';
import { parseCompanyQuery } from '@/lib/providers/parse';
import { checkUserCredits, deductUserCredits, getRemainingUserCredits } from '@/lib/db/queries';

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
  onCreateDocument: async ({ title, dataStream, session }) => {
    try {
      // Step 1: Check user credits (5 credits required for company search)
      dataStream.writeData({
        type: 'status',
        content: 'Checking your credits...',
      });

      const requiredCredits = 5;
      const remainingCredits = await getRemainingUserCredits({ userId: session.user.id });
      dbg('onCreateDocument: user credits', { remaining: remainingCredits, required: requiredCredits });

      if (remainingCredits < requiredCredits) {
        const errorMsg = `Insufficient credits. You have ${remainingCredits} credits remaining, but ${requiredCredits} are required. Please upgrade your plan to continue.`;
        dataStream.writeData({ type: 'error', content: errorMsg });
        dataStream.writeData({ type: 'finish', content: '' });
        // Return empty CSV so document gets saved and artifact is accessible from chat
        return '';
      }

      dataStream.writeData({
        type: 'status',
        content: `Credits: ${remainingCredits} available`,
      });

      // Step 2: Initialize
      dataStream.writeData({
        type: 'status',
        content: 'Initializing company search...',
      });

      if (!(await isCrustConfigured())) {
        const errorMsg =
          'Crustdata API is not configured. Please add your API token in Settings → API Keys.';
        dataStream.writeData({ type: 'error', content: errorMsg });
        dataStream.writeData({ type: 'finish', content: '' });
        return '';
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
        dataStream.writeData({ type: 'finish', content: '' });
        return '';
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

      // Step 8: Deduct credits for successful search
      await deductUserCredits({ userId: session.user.id, amount: requiredCredits });
      dbg('onCreateDocument: deducted credits', requiredCredits);

      const newRemainingCredits = await getRemainingUserCredits({ userId: session.user.id });

      // Step 9: Final status
      dataStream.writeData({
        type: 'status',
        content: `✓ Successfully loaded ${result.rows.length} companies`,
      });

      dataStream.writeData({
        type: 'status',
        content: `Credits remaining: ${newRemainingCredits}`,
      });

      return csv;
    } catch (error: any) {
      dbg('onCreateDocument: error', error?.message || error);

      // Send user-friendly error message
      const userMessage = error?.message || 'Oops! Something went wrong on our end. Our team has been notified. Please try again later.';
      dataStream.writeData({ type: 'error', content: userMessage });

      // Send finish message to prevent artifact from getting stuck in streaming state
      dataStream.writeData({ type: 'finish', content: '' });

      // Return empty CSV so document gets saved and artifact is accessible from chat
      return '';
    }
  },

  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    try {
      // Step 1: Check user credits (5 credits required for company search)
      dataStream.writeData({
        type: 'status',
        content: 'Checking your credits...',
      });

      const requiredCredits = 5;
      const remainingCredits = await getRemainingUserCredits({ userId: session.user.id });
      dbg('onUpdateDocument: user credits', { remaining: remainingCredits, required: requiredCredits });

      if (remainingCredits < requiredCredits) {
        const errorMsg = `Insufficient credits. You have ${remainingCredits} credits remaining, but ${requiredCredits} are required. Please upgrade your plan to continue.`;
        dataStream.writeData({ type: 'error', content: errorMsg });
        dataStream.writeData({ type: 'finish', content: '' });
        return document.content || '';
      }

      dataStream.writeData({
        type: 'status',
        content: `Credits: ${remainingCredits} available`,
      });

      // Step 2: Initialize
      dataStream.writeData({
        type: 'status',
        content: 'Updating company search...',
      });

      if (!(await isCrustConfigured())) {
        const errorMsg =
          'Crustdata API is not configured. Please add your API token in Settings → API Keys.';
        dataStream.writeData({ type: 'error', content: errorMsg });
        dataStream.writeData({ type: 'finish', content: '' });
        return document.content || '';
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
        dataStream.writeData({ type: 'finish', content: '' });
        return document.content || '';
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

      // Step 7: Deduct credits for successful update
      await deductUserCredits({ userId: session.user.id, amount: requiredCredits });
      dbg('onUpdateDocument: deducted credits', requiredCredits);

      const newRemainingCredits = await getRemainingUserCredits({ userId: session.user.id });

      // Step 8: Final status
      dataStream.writeData({
        type: 'status',
        content: `✓ Updated with ${result.rows.length} companies`,
      });

      dataStream.writeData({
        type: 'status',
        content: `Credits remaining: ${newRemainingCredits}`,
      });

      return csv;
    } catch (error: any) {
      dbg('onUpdateDocument: error', error?.message || error);

      // Send user-friendly error message
      const userMessage = error?.message || 'Oops! Something went wrong on our end. Our team has been notified. Please try again later.';
      dataStream.writeData({ type: 'error', content: userMessage });

      // Send finish message to prevent artifact from getting stuck in streaming state
      dataStream.writeData({ type: 'finish', content: '' });

      // Return existing content so document is accessible from chat
      return document.content || '';
    }
  },
});
