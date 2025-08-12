import { expect, test } from '../fixtures';
import { websetDocumentHandler } from '@/artifacts/webset/server';

test('returns demo data for ExampleCorp employees', async () => {
  const outputs: any[] = [];
  const dataStream = { writeData: (data: any) => outputs.push(data) } as any;
  await websetDocumentHandler.onCreateDocument({
    id: '1',
    title: 'Create a webset of ExampleCorp employees',
    dataStream,
    session: {} as any,
  });
  expect(outputs[0]).toEqual({
    type: 'sheet-delta',
    content:
      'Name,Title,Email\nAlice Johnson,CEO,alice@example.com\nBob Smith,CTO,bob@example.com\nCarol Davis,COO,carol@example.com',
  });
});
