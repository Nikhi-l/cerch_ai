import { streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';

export const dashboardDocumentHandler = createDocumentHandler<'dashboard'>({
  kind: 'dashboard',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system:
        'Generate JSON for a dashboard with "charts" and "stats" fields. Respond only with JSON.',
      prompt: title,
    });

    for await (const delta of fullStream) {
      if (delta.type === 'text-delta') {
        const { textDelta } = delta;
        draftContent += textDelta;
        dataStream.writeData({
          type: 'dashboard-delta',
          content: textDelta,
        });
      }
    }

    dataStream.writeData({
      type: 'chat-message',
      content: 'Dashboard generated.',
    });

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system:
        'Update the following dashboard JSON when the user requests new metrics. Respond only with JSON.',
      prompt: `${description}\n\nCurrent dashboard:\n${document.content}`,
    });

    for await (const delta of fullStream) {
      if (delta.type === 'text-delta') {
        const { textDelta } = delta;
        draftContent += textDelta;
        dataStream.writeData({
          type: 'dashboard-delta',
          content: textDelta,
        });
      }
    }

    dataStream.writeData({
      type: 'chat-message',
      content: 'Dashboard updated.',
    });

    return draftContent;
  },
});
