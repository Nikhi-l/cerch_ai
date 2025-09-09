import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { saveDocument, saveMessages, saveChat, getChatById } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { aggregatePeople } from '@/lib/providers';
import { crustPeopleProvider, isCrustConfigured } from '@/lib/providers/crustdata/client';
import { toCSV } from '@/lib/providers/normalize';
import { sortPeopleByImage } from '@/lib/providers/sort';
import { buildPeopleSearchQuery, type PeopleFilterSpec } from '@/lib/providers/crustdata/people-filters';

// Simple in-memory cache for demo/Crustdata results per user+spec
const peopleCache = new Map<string, { id: string; title: string; cursor: string | null; spec: any; savedAt: number }>();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const body = await request.json();
    const { chatId, baseQuery, title, filters, userMessage } = body || {};
    if (!chatId || !title) {
      return Response.json({ ok: false, error: 'Missing parameters' }, { status: 400 });
    }
    // Ensure chat exists in DB so history is persisted
    try {
      const existing = await getChatById({ id: chatId });
      if (!existing) {
        await saveChat({ id: chatId, userId: session.user.id, title, visibility: 'private' as any });
      }
    } catch {}

    if (!isCrustConfigured()) {
      // Simulate network/processing latency for demo feel
      await sleep(1400 + Math.floor(Math.random() * 600));
      // Demo fallback: create a small hardcoded CSV so it works without API keys
      const headers = [
        'name',
        'title',
        'company',
        'industry',
        'location',
        'linkedin_url',
        'website',
        'profile_image_url',
        'description',
        'tags',
      ];
      const demoRows = [
        ['Sam Taylor','Software Engineer','OpenAI','AI','San Francisco Bay Area','https://www.linkedin.com/in/demo-samt','https://openai.com','https://avatar.vercel.sh/sam-taylor','Senior SWE building AI tooling','demo'],
        ['Priya Shah','Senior ML Engineer','Anthropic','AI','San Francisco','https://www.linkedin.com/in/demo-priya','https://www.anthropic.com','','Applied ML for LLM safety','demo'],
        ['Alex Chen','Infra Engineer','Databricks','Data & AI','San Francisco','https://www.linkedin.com/in/demo-alexc','https://databricks.com','https://avatar.vercel.sh/alex-chen','Infra and data pipelines','demo'],
        ['Jordan Lee','Staff SRE','Google','Internet','Mountain View','https://www.linkedin.com/in/demo-jordanl','https://about.google','','SRE for large-scale systems','demo'],
        ['Maria Garcia','AI Research Engineer','Meta','Internet','Menlo Park','https://www.linkedin.com/in/demo-mariag','https://about.facebook.com','','LLM research engineering','demo'],
      ];
      // Sort demo rows so entries with an image URL come first
      const imageIdx = headers.indexOf('profile_image_url');
      const sortedDemoRows = [...demoRows].sort((a, b) => {
        const aHas = (a[imageIdx] || '').toString().trim().length > 0;
        const bHas = (b[imageIdx] || '').toString().trim().length > 0;
        if (aHas === bHas) return 0;
        return aHas ? -1 : 1;
      });
      const csv = [headers, ...sortedDemoRows].map((r) => r.map(String).join(',')).join('\n');
      const id = generateUUID();
      await saveDocument({ id, title, content: csv, kind: 'people', userId: session.user.id });
      peopleCache.set(`${session.user.id}|${title}|demo`, { id, title, cursor: null, spec: null, savedAt: Date.now() });
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
                result: { id, title, kind: 'people' },
              },
            }],
            attachments: [],
            createdAt: new Date(),
          }],
        });
      } catch {}
      return Response.json({ ok: true, id, title, cursor: null, spec: null }, { status: 200 });
    }

    const spec: PeopleFilterSpec = {
      region: filters?.region,
      title: filters?.title,
      company: filters?.company,
      skills: filters?.skills,
      languages: filters?.languages,
      minConnections: filters?.minConnections,
      experienceBucket: filters?.yearsOfExperience,
      employerSizeMin: filters?.sizeMin,
      employerSizeMax: filters?.sizeMax,
      industry: filters?.industry,
    };
    const cacheKey = `${session.user.id}|${title}|${JSON.stringify(spec)}|50`;
    const cached = peopleCache.get(cacheKey);
    if (cached) {
      try {
        const existing = await getChatById({ id: chatId });
        if (!existing) {
          await saveChat({ id: chatId, userId: session.user.id, title, visibility: 'private' as any });
        }
        await saveMessages({
          messages: [{
            chatId,
            id: generateUUID(),
            role: 'assistant',
            parts: [{ type: 'tool-invocation', toolInvocation: { toolName: 'createDocument', toolCallId: generateUUID(), state: 'result', result: { id: cached.id, title: cached.title, kind: 'people' } } }],
            attachments: [],
            createdAt: new Date(),
          }],
        });
      } catch {}
      return Response.json({ ok: true, id: cached.id, title: cached.title, cursor: cached.cursor, spec: cached.spec }, { status: 200 });
    }
    const query = buildPeopleSearchQuery(spec, 50, baseQuery);
    await sleep(600 + Math.floor(Math.random() * 400));
    const result = await crustPeopleProvider.getPeople(query);
    if (!result.rows?.length) {
      return Response.json({ ok: false, error: 'No profiles found' }, { status: 200 });
    }

    const headers = [
      'name',
      'title',
      'company',
      'industry',
      'location',
      'linkedin_url',
      'website',
      'profile_image_url',
      'description',
      'tags',
    ];
    const sortedRows = sortPeopleByImage(result.rows as any[]);
    const csv = toCSV(headers, sortedRows as any[]);
    const id = generateUUID();
    await saveDocument({ id, title, content: csv, kind: 'people', userId: session.user.id });
    peopleCache.set(cacheKey, { id, title, cursor: result.nextCursor ?? null, spec, savedAt: Date.now() });

    // Append assistant message so the artifact can be reopened later from chat
    try {
      await saveMessages({
        messages: [
          {
            chatId,
            id: generateUUID(),
            role: 'assistant',
            parts: [
              {
                type: 'tool-invocation',
                toolInvocation: {
                  toolName: 'createDocument',
                  toolCallId: generateUUID(),
                  state: 'result',
                  result: { id, title, kind: 'people' },
                },
              },
            ],
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    } catch {}

    return Response.json({ ok: true, id, title, cursor: result.nextCursor ?? null, spec }, { status: 200 });
  } catch (e: any) {
    console.error('[CERCH:PEOPLE] error', e?.message || e);
    return Response.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
