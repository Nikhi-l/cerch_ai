import { getProvider } from '@/lib/ai/providers';
import { websetPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamObject } from 'ai';
import { z } from 'zod';
import { generateBangaloreCSV } from '@/lib/data/bangalore-startups';

export const websetDocumentHandler = createDocumentHandler<'webset'>({
  kind: 'webset',
  onCreateDocument: async ({ title, dataStream, apiKey }) => {
    let draftContent = '';

    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle.includes('startups in bangalore')) {
      draftContent = generateBangaloreCSV();
      dataStream.writeData({ type: 'sheet-delta', content: draftContent });
      return draftContent;
    }

    const provider = getProvider(apiKey);
    const { fullStream } = streamObject({
      model: provider.languageModel('artifact-model'),
      system: websetPrompt,
      prompt: title,
      schema: z.object({
        csv: z.string().describe('CSV data'),
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

    dataStream.writeData({
      type: 'sheet-delta',
      content: draftContent,
    });

    return draftContent;
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
