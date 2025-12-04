/**
 * Improved People Artifact Handler with:
 * - Progressive CSV streaming (stream rows as they arrive)
 * - Better status updates throughout the process
 * - Partial result preservation on error
 * - Better integration with improved CrustData client
 */

import { createDocumentHandler } from '@/lib/artifacts/server-improved';
import { aggregatePeople } from '@/lib/providers';
import {
  crustPeopleProvider,
  isCrustConfigured,
  getRemainingCredits,
} from '@/lib/providers/crustdata/client-improved';
import { toCSV } from '@/lib/providers/normalize';
import { buildPeopleQuery } from '@/lib/providers/people-extract';

function debugEnabled() {
  return process.env.DEBUG_CRUSTDATA === 'true';
}

function dbg(...args: any[]) {
  if (debugEnabled()) console.log('[CRUSTDATA:PEOPLE]', ...args);
}

/**
 * Stream CSV rows progressively instead of building entire CSV first
 */
function streamCSVRows(
  headers: string[],
  rows: any[],
  dataStream: any,
  chunkSize: number = 10
): string {
  // Send headers first
  const csvLines: string[] = [headers.join(',')];

  // Stream rows in chunks for better UX
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    // Convert chunk to CSV lines
    const chunkLines = chunk.map(row => {
      return headers.map(h => {
        const value = row[h] ?? '';
        // Escape CSV values
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
          ? `"${escaped}"`
          : escaped;
      }).join(',');
    });

    csvLines.push(...chunkLines);

    // Stream this chunk
    const partialCSV = csvLines.join('\n');
    dataStream.writeData({ type: 'sheet-delta', content: partialCSV });

    // Update status
    if (i + chunkSize < rows.length) {
      dataStream.writeData({
        type: 'status',
        content: `Processed ${Math.min(i + chunkSize, rows.length)} of ${rows.length} profiles...`,
      });
    }
  }

  return csvLines.join('\n');
}

export const peopleDocumentHandler = createDocumentHandler<'people'>({
  kind: 'people',
  onCreateDocument: async ({ title, dataStream }) => {
    try {
      // Step 1: Check configuration
      dataStream.writeData({
        type: 'status',
        content: 'Initializing people search...',
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
        const errorMsg = `Low credits (${credits} remaining). You may not be able to complete this search.`;
        dataStream.writeData({ type: 'error', content: errorMsg });
        // Don't throw - let user proceed if they want
      } else {
        dataStream.writeData({
          type: 'status',
          content: `Credits available: ${credits}`,
        });
      }

      // Step 3: Parse query
      dataStream.writeData({
        type: 'status',
        content: 'Analyzing your search criteria...',
      });

      const query = await buildPeopleQuery(title, 50);
      dbg('onCreateDocument: parsed query', { title, query });

      // Step 4: Show what we're searching for
      const filterDescription = [];
      if (query.filters) {
        const filters = query.filters as any;
        if (filters.title) filterDescription.push(`Title: ${filters.title}`);
        if (filters.company) filterDescription.push(`Company: ${filters.company}`);
        if (filters.region || filters.location)
          filterDescription.push(`Location: ${filters.region || filters.location}`);
        if (filters.industry) filterDescription.push(`Industry: ${filters.industry}`);
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
        content: 'Searching 200M+ professional profiles...',
      });

      const result = await aggregatePeople(query, [crustPeopleProvider]);
      dbg('onCreateDocument: provider result count', result.rows.length);

      // Step 6: Handle results
      if (result.rows.length === 0) {
        const message =
          'No profiles matched your search criteria. Try:\n• Using broader job titles\n• Expanding the location\n• Removing some filters';
        dataStream.writeData({ type: 'error', content: message });
        throw new Error(message);
      }

      dataStream.writeData({
        type: 'status',
        content: `Found ${result.rows.length} matching profiles. Preparing results...`,
      });

      // Step 7: Prepare and stream CSV progressively
      const headers = [
        'name',
        'title',
        'company',
        'industry',
        'location',
        'linkedin_url',
        'website',
        'profile_image_url',
        'description',
        'tags',
      ];

      dbg('onCreateDocument: streaming CSV progressively');

      // Stream CSV in chunks
      const csv = streamCSVRows(headers, result.rows as any[], dataStream, 10);

      dbg('onCreateDocument: total CSV length', csv.length);

      // Step 8: Final status
      dataStream.writeData({
        type: 'status',
        content: `✓ Successfully loaded ${result.rows.length} profiles`,
      });

      // Show remaining credits if available
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
      // Re-throw to let the handler process it
      throw error;
    }
  },

  onUpdateDocument: async ({ document, description, dataStream }) => {
    try {
      // Step 1: Initialize
      dataStream.writeData({
        type: 'status',
        content: 'Updating search criteria...',
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
        content: 'Analyzing updated search criteria...',
      });

      const text = description || document.title;
      const query = await buildPeopleQuery(text, 50);
      dbg('onUpdateDocument: parsed query', { text, query });

      // Step 4: Execute search
      dataStream.writeData({
        type: 'status',
        content: 'Searching with new criteria...',
      });

      const result = await aggregatePeople(query, [crustPeopleProvider]);
      dbg('onUpdateDocument: provider result count', result.rows.length);

      // Step 5: Handle results
      if (result.rows.length === 0) {
        const message =
          'No profiles matched your updated criteria. Try less restrictive filters.';
        dataStream.writeData({ type: 'error', content: message });
        throw new Error(message);
      }

      dataStream.writeData({
        type: 'status',
        content: `Found ${result.rows.length} profiles with updated criteria...`,
      });

      // Step 6: Stream updated CSV
      const headers = [
        'name',
        'title',
        'company',
        'industry',
        'location',
        'linkedin_url',
        'website',
        'profile_image_url',
        'description',
        'tags',
      ];

      const csv = streamCSVRows(headers, result.rows as any[], dataStream, 10);
      dbg('onUpdateDocument: streamed CSV length', csv.length);

      // Step 7: Final status
      dataStream.writeData({
        type: 'status',
        content: `✓ Updated with ${result.rows.length} profiles`,
      });

      return csv;
    } catch (error: any) {
      dbg('onUpdateDocument: error', error?.message || error);
      throw error;
    }
  },
});
