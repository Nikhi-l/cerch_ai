import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { saveDocument, saveMessages, saveChat, getChatById } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { crustCompanyProvider, isCrustConfigured } from '@/lib/providers/crustdata/client';
import type { SearchQuery } from '@/lib/providers/types';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }
  try {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const body = await request.json();
    const { chatId, title, userMessage, filters } = body || {};
    if (!chatId || !title) {
      return Response.json({ ok: false, error: 'Missing parameters' }, { status: 400 });
    }
    try {
      const existing = await getChatById({ id: chatId });
      if (!existing) {
        await saveChat({ id: chatId, userId: session.user.id, title, visibility: 'private' as any });
      }
    } catch {}
    // If Crustdata token is configured, fetch lots of results using Company Search
    if (await isCrustConfigured()) {
      await sleep(800 + Math.floor(Math.random() * 400));
      const query: SearchQuery = {
        q: '',
        limit: 100,
        filters: filters || {},
      };
      const result = await crustCompanyProvider.getCompanies(query);
      const headers = ['name','industry','company_url','linkedin_url','location','size','funding','logo_url','description','tags'];
      const rows = (result.rows || []).map((r: any) => [
        r.name || '', r.industry || '', r.company_url || '', r.linkedin_url || '', r.location || '', r.size || '', r.funding || '', r.logo_url || '', r.description || '', r.tags || ''
      ]);
      const csv = [headers, ...rows].map((r) => r.map(String).join(',')).join('\n');
      const id = generateUUID();
      await saveDocument({ id, title, content: csv, kind: 'company', userId: session.user.id });
      try {
        if (userMessage) {
          await saveMessages({ messages: [{ chatId, id: generateUUID(), role: 'user', parts: [{ type: 'text', text: userMessage } as any], attachments: [], createdAt: new Date() }] });
        }
        await saveMessages({ messages: [{ chatId, id: generateUUID(), role: 'assistant', parts: [{ type: 'tool-invocation', toolInvocation: { toolName: 'createDocument', toolCallId: generateUUID(), state: 'result', result: { id, title, kind: 'company' } } }], attachments: [], createdAt: new Date() }] });
      } catch {}
      return Response.json({ ok: true, id, title }, { status: 200 });
    }

    // Otherwise, demo dataset (>= 60 rows) with artificial delay
    await sleep(1400 + Math.floor(Math.random() * 600));
    const headers = ['name','industry','company_url','linkedin_url','location','size','funding','logo_url','description','tags'];
    const seedRows = [
      ['LangChain Labs','AI','https://langchain.com','https://www.linkedin.com/company/langchain/','San Francisco Bay Area','51-200','$25M','','AI developer tooling','demo'],
      ['Vercel','Software','https://vercel.com','https://www.linkedin.com/company/vercel/','San Francisco Bay Area','501-1,000','$313M','','Frontend platform','demo'],
      ['Anthropic','AI','https://www.anthropic.com','https://www.linkedin.com/company/anthropic/','San Francisco','501-1,000','$7.6B','','AI safety research','demo'],
      ['ElevenLabs','AI','https://elevenlabs.io','https://www.linkedin.com/company/elevenlabs-io/','Remote','51-200','$100M','','Voice AI','demo'],
      ['Hugging Face','AI','https://huggingface.co','https://www.linkedin.com/company/huggingface/','Remote','201-500','$395M','','Open ML platform','demo'],
      ['Cohere','AI','https://cohere.com','https://www.linkedin.com/company/cohere-ai/','Toronto','201-500','$445M','','LLM for enterprise','demo'],
    ];
    const rows = Array.from({ length: 60 }, (_, i) => seedRows[i % seedRows.length].map((v, idx) => idx === 0 ? `${v} ${Math.floor(i/seedRows.length)+1}` : v));
    const csv = [headers, ...rows].map((r) => r.map(String).join(',')).join('\n');
    const id = generateUUID();
    await saveDocument({ id, title, content: csv, kind: 'company', userId: session.user.id });
    try {
      await saveMessages({
        messages: [{
          chatId,
          id: generateUUID(),
          role: 'assistant',
          parts: [{
            type: 'tool-invocation',
            toolInvocation: {
              toolName: 'createDocument',
              toolCallId: generateUUID(),
              state: 'result',
              result: { id, title, kind: 'company' },
            },
          }],
          attachments: [],
          createdAt: new Date(),
        }],
      });
    } catch {}
    return Response.json({ ok: true, id, title }, { status: 200 });
  } catch (e: any) {
    console.error('[CERCH:COMPANY] error', e?.message || e);
    return Response.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
