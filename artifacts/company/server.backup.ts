import { createDocumentHandler } from '@/lib/artifacts/server';
import { aggregateCompanies } from '@/lib/providers';
import { crustCompanyProvider } from '@/lib/providers/crustdata/client';
import { toCSV } from '@/lib/providers/normalize';
import { isCrustConfigured } from '@/lib/providers/crustdata/client';
import { parseCompanyQuery } from '@/lib/providers/parse';

function debugEnabled() {
  return process.env.DEBUG_CRUSTDATA === 'true';
}

function dbg(...args: any[]) {
  if (debugEnabled()) console.log('[CRUSTDATA:COMPANY]', ...args);
}

export const companyDocumentHandler = createDocumentHandler<'company'>({
  kind: 'company',
  onCreateDocument: async ({ title, dataStream }) => {
    dataStream.writeData({ type: 'status', content: 'Scanning companies. Hang on while we prepare your list…' });
    if (!(await isCrustConfigured())) {
      dataStream.writeData({ type: 'error', content: 'Crustdata API is not configured. Set CRUSTDATA_API_TOKEN in your environment.' });
      const headers = ['name','industry','company_url','linkedin_url','location','size','funding','logo_url','description','tags'];
      const emptyCsv = toCSV(headers, []);
      return emptyCsv;
    }
    const query = parseCompanyQuery(title, 50);
    dbg('onCreateDocument: parsed query', { title, query });
    const result = await aggregateCompanies(query, [crustCompanyProvider]);
    dbg('onCreateDocument: provider result count', result.rows.length);
    if (result.rows.length === 0) {
      dataStream.writeData({ type: 'error', content: 'No companies found or provider denied access (check Crustdata token/credits).' });
    }
    dataStream.writeData({
      type: 'status',
      content: `Found ${result.rows.length} companies. Preparing your list…`,
    });

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

    const csv = toCSV(headers, result.rows as any[]);
    dataStream.writeData({ type: 'sheet-delta', content: csv });
    dbg('onCreateDocument: streamed CSV length', csv.length);
    return csv;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    dataStream.writeData({
      type: 'status',
      content: 'Updating results. Finding the right companies for you…',
    });
    const text = description || document.title;
    const query = parseCompanyQuery(text, 50);
    dbg('onUpdateDocument: parsed query', { text, query });
    const result = await aggregateCompanies(query, [crustCompanyProvider]);
    dbg('onUpdateDocument: provider result count', result.rows.length);
    dataStream.writeData({
      type: 'status',
      content: `Found ${result.rows.length} companies. Preparing your list…`,
    });

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

    const csv = toCSV(headers, result.rows as any[]);
    dataStream.writeData({ type: 'sheet-delta', content: csv });
    dbg('onUpdateDocument: streamed CSV length', csv.length);
    return csv;
  },
});
