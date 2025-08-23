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
        'Return JSON for a dashboard with "charts" and "stats" fields. "charts" should include an array with one object { "title": "Traffic source", "data": [{ "label": string, "value": number }] }. "stats" should start with { "label": "Visitors this month", "value": string, "change": string } followed by four widget objects { "label": string, "value": string }. Respond only with JSON.',
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
        'Update the following dashboard JSON when the user requests new metrics. Maintain the same "charts" and "stats" structure as in the initial response. Respond only with JSON.',
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
