import { createDocumentHandler } from '@/lib/artifacts/server';
import { aggregatePeople } from '@/lib/providers';
import { crustPeopleProvider } from '@/lib/providers/crustdata/client';
import { toCSV } from '@/lib/providers/normalize';

export const peopleDocumentHandler = createDocumentHandler<'people'>({
  kind: 'people',
  onCreateDocument: async ({ title, dataStream, apiKey }) => {
    const query = { q: title, limit: 50 };
    const result = await aggregatePeople(query, [crustPeopleProvider]);

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

    return csv;
  },
  onUpdateDocument: async ({ document, description, dataStream, apiKey }) => {
    const query = { q: description || document.title, limit: 50 };
    const result = await aggregatePeople(query, [crustPeopleProvider]);

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
    return csv;
  },
});
