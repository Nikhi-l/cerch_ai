import { createDocumentHandler } from '@/lib/artifacts/server';

const CRUSTDATA_TOKEN =
  process.env.CRUSTDATA_TOKEN || 'a8695e91fcf954209117407c1e29c04ae8715141';

async function fetchWebsetCsv(query: string): Promise<string> {
  const response = await fetch('https://api.crustdata.com/websets', {
    method: 'POST',
    headers: {
      Authorization: `Token ${CRUSTDATA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      search: { query },
    }),
  });

  if (!response.ok) {
    throw new Error(`Crustdata request failed: ${response.status}`);
  }

  const data = (await response.json()) as { csv?: string };
  return data.csv || '';
}

export const websetDocumentHandler = createDocumentHandler<'webset'>({
  kind: 'webset',
  onCreateDocument: async ({ title, dataStream }) => {
    const csv = await fetchWebsetCsv(title);
    dataStream.writeData({ type: 'sheet-delta', content: csv });
    return csv;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    const csv = await fetchWebsetCsv(description);
    dataStream.writeData({ type: 'sheet-delta', content: csv });
    return csv;
  },
});

