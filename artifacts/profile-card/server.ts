import { createDocumentHandler } from '@/lib/artifacts/server';

export const profileCardDocumentHandler = createDocumentHandler<'profile_card'>({
  kind: 'profile_card',
  onCreateDocument: async ({ title, dataStream }) => {
    const data = {
      name: title,
      title: '',
      company: '',
    };
    dataStream.writeData({
      type: 'profile-card-delta',
      content: JSON.stringify(data),
    });
    return JSON.stringify(data);
  },
  onUpdateDocument: async ({ document, dataStream }) => {
    dataStream.writeData({
      type: 'profile-card-delta',
      content: document.content ?? '',
    });
    return document.content ?? '';
  },
});
