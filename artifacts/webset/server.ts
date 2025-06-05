import { createDocumentHandler } from '@/lib/artifacts/server';
import { resultsToCSV, searchExa } from '@/lib/exa';

export const websetDocumentHandler = createDocumentHandler<'webset'>({
  kind: 'webset',
  onCreateDocument: async ({ title, dataStream }) => {
    const results = await searchExa({ query: title, category: 'company' });
    const csv = resultsToCSV(results);

    dataStream.writeData({
      type: 'sheet-delta',
      content: csv,
    });

    return csv;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    const results = await searchExa({ query: description, category: 'company' });
    const csv = resultsToCSV(results);

    dataStream.writeData({
      type: 'sheet-delta',
      content: csv,
    });

    return csv;
  },
});
