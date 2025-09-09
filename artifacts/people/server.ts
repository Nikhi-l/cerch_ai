import { createDocumentHandler } from '@/lib/artifacts/server';
import { aggregatePeople } from '@/lib/providers';
import { crustPeopleProvider, isCrustConfigured } from '@/lib/providers/crustdata/client';
import { toCSV } from '@/lib/providers/normalize';
import { buildPeopleQuery } from '@/lib/providers/people-extract';

function debugEnabled() {
  return process.env.DEBUG_CRUSTDATA === 'true';
}

function dbg(...args: any[]) {
  if (debugEnabled()) console.log('[CRUSTDATA:PEOPLE]', ...args);
}

export const peopleDocumentHandler = createDocumentHandler<'people'>({
  kind: 'people',
  onCreateDocument: async ({ title, dataStream }) => {
    dataStream.writeData({
      type: 'status',
      content: 'Parsing your request… extracting filters…',
    });
    const query = await buildPeopleQuery(title, 50);
    dbg('onCreateDocument: parsed query', { title, query });
    if (!(await isCrustConfigured())) {
      dataStream.writeData({ type: 'error', content: 'Crustdata API is not configured. Set CRUSTDATA_API_TOKEN in your environment.' });
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
      const emptyCsv = toCSV(headers, []);
      return emptyCsv;
    }
    dataStream.writeData({ type: 'status', content: 'Searching across 200M+ people profiles…' });
    const result = await aggregatePeople(query, [crustPeopleProvider]);
    dbg('onCreateDocument: provider result count', result.rows.length);
    if (result.rows.length === 0) {
      dataStream.writeData({ type: 'error', content: 'No people found or provider denied access (check Crustdata token/credits).' });
    }
    dataStream.writeData({
      type: 'status',
      content: `Found ${result.rows.length} profiles. Preparing your list…`,
    });

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

    const csv = toCSV(headers, result.rows as any[]);
    
    dataStream.writeData({ type: 'sheet-delta', content: csv });
    dbg('onCreateDocument: streamed CSV length', csv.length);
    
    return csv;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    dataStream.writeData({
      type: 'status',
      content: 'Parsing your update… extracting filters…',
    });
    const text = description || document.title;
    const query = await buildPeopleQuery(text, 50);
    dbg('onUpdateDocument: parsed query', { text, query });
    if (!(await isCrustConfigured())) {
      dataStream.writeData({ type: 'error', content: 'Crustdata API is not configured. Set CRUSTDATA_API_TOKEN in your environment.' });
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
      const emptyCsv = toCSV(headers, []);
      return emptyCsv;
    }
    dataStream.writeData({ type: 'status', content: 'Finding the right people for you…' });
    const result = await aggregatePeople(query, [crustPeopleProvider]);
    dbg('onUpdateDocument: provider result count', result.rows.length);
    if (result.rows.length === 0) {
      dataStream.writeData({ type: 'error', content: 'No people found or provider denied access (check Crustdata token/credits).' });
    }
    dataStream.writeData({
      type: 'status',
      content: `Found ${result.rows.length} profiles. Preparing your list…`,
    });

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

    const csv = toCSV(headers, result.rows as any[]);
    dataStream.writeData({ type: 'sheet-delta', content: csv });
    dbg('onUpdateDocument: streamed CSV length', csv.length);
    return csv;
  },
});
