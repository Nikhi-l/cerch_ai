import { createDocumentHandler } from '@/lib/artifacts/server';
import { aggregatePeople } from '@/lib/providers';
import { crustPeopleProvider } from '@/lib/providers/crustdata/client';
import { toCSV } from '@/lib/providers/normalize';
import { parsePeopleQuery } from '@/lib/providers/parse';

function debugEnabled() {
  return process.env.DEBUG_CRUSTDATA === 'true';
}

function dbg(...args: any[]) {
  if (debugEnabled()) console.log('[CRUSTDATA:PEOPLE]', ...args);
}

export const peopleDocumentHandler = createDocumentHandler<'people'>({
  kind: 'people',
  onCreateDocument: async ({ title, dataStream }) => {
    const query = parsePeopleQuery(title, 50);
    dbg('onCreateDocument: parsed query', { title, query });
    const result = await aggregatePeople(query, [crustPeopleProvider]);
    dbg('onCreateDocument: provider result count', result.rows.length);

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
    const text = description || document.title;
    const query = parsePeopleQuery(text, 50);
    dbg('onUpdateDocument: parsed query', { text, query });
    const result = await aggregatePeople(query, [crustPeopleProvider]);
    dbg('onUpdateDocument: provider result count', result.rows.length);

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
