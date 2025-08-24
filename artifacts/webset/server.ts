import { getProvider } from '@/lib/ai/providers';
import { updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';
import {
  fetchCompanyProfile,
  fetchCompanyPeople,
  getCrustdataApiKey,
  companyToCsv,
  peopleToCsv,
} from '@/lib/crustdata';
import { streamObject } from 'ai';
import { z } from 'zod';

function parseCompanyQuery(input: string):
  | { company_id: number }
  | { company_domain: string }
  | null {
  const trimmed = input.trim();
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) {
    return { company_id: asNumber };
  }
  const match = trimmed.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (match) {
    return { company_domain: match[1] };
  }
  return null;
}


export const websetDocumentHandler = createDocumentHandler<'webset'>({
  kind: 'webset',
  onCreateDocument: async ({ title, dataStream }) => {
    const token = await getCrustdataApiKey();
    if (!token) {
      dataStream.writeData({
        type: 'error',
        content: 'Missing Crustdata API key',
      });
      return '';
    }

    const query = parseCompanyQuery(title);
    if (!query) {
      dataStream.writeData({
        type: 'error',
        content: 'Please provide a company domain or ID.',
      });
      return '';
    }

    try {
      const profile = await fetchCompanyProfile(token, query);
      if (!profile.length) {
        dataStream.writeData({
          type: 'error',
          content: 'No company data found.',
        });
        return '';
      }

      let csv = companyToCsv(profile);
      dataStream.writeData({ type: 'sheet-delta', content: csv });

      // attempt to fetch people dump link
      try {
        const company = profile[0];
        if (company?.company_id) {
          const people = await fetchCompanyPeople(token, {
            company_id: company.company_id,
            s3_username: 'ext-user-crustdata',
          });
          const peopleRow = peopleToCsv(people);
          csv += `\n${peopleRow}`;
          dataStream.writeData({
            type: 'sheet-delta',
            content: `\n${peopleRow}`,
          });
        }
      } catch (err) {
        dataStream.writeData({
          type: 'error',
          content: 'Failed to fetch company people.',
        });
      }

      return csv;
    } catch (err: unknown) {
      dataStream.writeData({
        type: 'error',
        content: err instanceof Error ? err.message : 'Unknown error',
      });
      return '';
    }
  },
  onUpdateDocument: async ({ document, description, dataStream, apiKey }) => {
    let draftContent = '';

    const provider = getProvider(apiKey);
    const { fullStream } = streamObject({
      model: provider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'webset'),
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.writeData({
            type: 'sheet-delta',
            content: csv,
          });

          draftContent = csv;
        }
      }
    }

    return draftContent;
  },
});
