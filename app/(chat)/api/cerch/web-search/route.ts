import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { saveDocument, saveMessages, saveChat, getChatById } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import {
  crustWebSearchProvider,
  isCrustConfigured,
  CrustdataError,
} from '@/lib/providers/crustdata/client';
import type { WebSearchSource, WebSearchGeolocation } from '@/lib/providers/types';

// Simple in-memory cache for demo/Crustdata results per user+query
const webSearchCache = new Map<
  string,
  { id: string; title: string; query: string; savedAt: number }
>();

interface WebSearchFilters {
  sources?: WebSearchSource[];
  geolocation?: WebSearchGeolocation;
  site?: string;
  startDate?: number;
  endDate?: number;
  fetchContent?: boolean;
}

/**
 * Generate demo search results when API is not configured
 */
function getDemoResults(query: string): any[] {
  const demoData = [
    {
      title: `${query} - Latest News and Analysis`,
      url: 'https://techcrunch.com/demo-article',
      snippet: `Comprehensive coverage of ${query} including market trends, industry insights, and expert analysis.`,
      source: 'news',
      position: 1,
    },
    {
      title: `Understanding ${query}: A Complete Guide`,
      url: 'https://www.example.com/guide',
      snippet: `Everything you need to know about ${query}, from fundamentals to advanced concepts.`,
      source: 'web',
      position: 2,
    },
    {
      title: `${query} Research Paper - Academic Study`,
      url: 'https://scholar.google.com/demo',
      snippet: `Peer-reviewed research examining the impact and implications of ${query} in modern contexts.`,
      source: 'scholar-articles',
      position: 3,
    },
    {
      title: `Industry Report: ${query} Market Analysis 2025`,
      url: 'https://www.forbes.com/demo',
      snippet: `In-depth market analysis and forecasts for ${query} sector growth over the next decade.`,
      source: 'news',
      position: 4,
    },
    {
      title: `How ${query} is Changing the Landscape`,
      url: 'https://www.wired.com/demo',
      snippet: `Exploring the transformative effects of ${query} on technology, business, and society.`,
      source: 'web',
      position: 5,
    },
  ];

  return demoData;
}

/**
 * Convert results to CSV format
 */
function toCSV(
  headers: string[],
  rows: Record<string, any>[]
): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => {
    return headers.map(h => {
      const value = row[h] ?? '';
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
        ? `"${escaped}"`
        : escaped;
    }).join(',');
  });

  return [headerLine, ...dataLines].join('\n');
}

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
        await saveChat({
          id: chatId,
          userId: session.user.id,
          title,
          visibility: 'private' as any,
        });
      }
    } catch {}

    const searchFilters: WebSearchFilters = filters || {};

    // Check if CrustData is configured
    if (!(await isCrustConfigured())) {
      // Simulate network/processing latency for demo feel
      await sleep(1000 + Math.floor(Math.random() * 500));

      // Demo fallback: create results using demo data
      const demoRows = getDemoResults(baseQuery || title);

      const headers = ['title', 'url', 'snippet', 'source', 'position'];
      const csv = toCSV(headers, demoRows);

      const id = generateUUID();
      await saveDocument({
        id,
        title,
        content: csv,
        kind: 'web-search',
        userId: session.user.id,
      });

      webSearchCache.set(`${session.user.id}|${baseQuery}|demo`, {
        id,
        title,
        query: baseQuery,
        savedAt: Date.now(),
      });

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
                    result: { id, title, kind: 'web-search' },
                  },
                },
              ],
              attachments: [],
              createdAt: new Date(),
            },
          ],
        });
      } catch {}

      return Response.json(
        {
          ok: true,
          id,
          title,
          query: baseQuery,
          resultCount: demoRows.length,
          demo: true,
        },
        { status: 200 }
      );
    }

    // Check cache for identical query
    const cacheKey = `${session.user.id}|${baseQuery}|${JSON.stringify(searchFilters)}`;
    const cached = webSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < 5 * 60 * 1000) {
      // Cache hit within 5 minutes
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
                    result: { id: cached.id, title: cached.title, kind: 'web-search' },
                  },
                },
              ],
              attachments: [],
              createdAt: new Date(),
            },
          ],
        });
      } catch {}

      return Response.json(
        {
          ok: true,
          id: cached.id,
          title: cached.title,
          query: cached.query,
          cached: true,
        },
        { status: 200 }
      );
    }

    // Execute web search via CrustData
    await sleep(400 + Math.floor(Math.random() * 300));

    let result: Awaited<ReturnType<typeof crustWebSearchProvider.search>> | undefined;
    try {
      result = await crustWebSearchProvider.search({
        query: baseQuery || title,
        sources: searchFilters.sources,
        geolocation: searchFilters.geolocation,
        site: searchFilters.site,
        startDate: searchFilters.startDate,
        endDate: searchFilters.endDate,
        fetchContent: searchFilters.fetchContent,
      });
    } catch (error: any) {
      if (error instanceof CrustdataError) {
        return Response.json(
          {
            ok: false,
            error:
              error.status === 401 || error.status === 403
                ? 'Your Crustdata token is invalid or missing. Update it in settings to run live searches.'
                : error.message,
          },
          { status: error.status && error.status >= 400 ? error.status : 502 }
        );
      }
      console.error('[CERCH:WEB-SEARCH] unexpected error', error?.message || error);
      return Response.json(
        { ok: false, error: 'Web search failed. Please try again.' },
        { status: 502 }
      );
    }

    if (!result.rows?.length) {
      return Response.json(
        {
          ok: false,
          error:
            'No results found for your search. Try different keywords or removing filters.',
        },
        { status: 200 }
      );
    }

    // Convert results to CSV
    const headers = ['title', 'url', 'snippet', 'source', 'position'];
    const csv = toCSV(headers, result.rows as any[]);

    const id = generateUUID();
    await saveDocument({
      id,
      title,
      content: csv,
      kind: 'web-search',
      userId: session.user.id,
    });

    webSearchCache.set(cacheKey, {
      id,
      title,
      query: baseQuery,
      savedAt: Date.now(),
    });

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
                  result: { id, title, kind: 'web-search' },
                },
              },
            ],
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    } catch {}

    return Response.json(
      {
        ok: true,
        id,
        title,
        query: baseQuery,
        resultCount: result.rows.length,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('[CERCH:WEB-SEARCH] error', e?.message || e);
    return Response.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
