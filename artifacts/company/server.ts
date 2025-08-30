import { createDocumentHandler } from '@/lib/artifacts/server';
import { aggregateCompanies } from '@/lib/providers';
import { crustCompanyProvider } from '@/lib/providers/crustdata/client';
import { toCSV } from '@/lib/providers/normalize';

export const companyDocumentHandler = createDocumentHandler<'company'>({
  kind: 'company',
  onCreateDocument: async ({ title, dataStream, apiKey }) => {
    const query = { q: title, limit: 50 };
    const result = await aggregateCompanies(query, [crustCompanyProvider]);

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
    return csv;
  },
  onUpdateDocument: async ({ document, description, dataStream, apiKey }) => {
    const query = { q: description || document.title, limit: 50 };
    const result = await aggregateCompanies(query, [crustCompanyProvider]);

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
    return csv;
  },
});
