import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { enrichPeopleBasicProfile } from '@/lib/providers/crustdata/client';
import { normalizePeopleRows } from '@/lib/providers/normalize';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const body = await request.json();
    const urls: string[] = Array.isArray(body?.linkedin_urls) ? body.linkedin_urls.filter(Boolean) : [];
    if (!urls.length) {
      return Response.json({ ok: false, error: 'linkedin_urls required' }, { status: 400 });
    }
    // Crustdata supports up to 25 per request
    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += 25) batches.push(urls.slice(i, i + 25));
    const results: any[] = [];
    for (const b of batches) {
      const arr = await enrichPeopleBasicProfile(b);
      results.push(...arr);
    }
    const normalized = normalizePeopleRows(results);
    return Response.json({ ok: true, profiles: normalized }, { status: 200 });
  } catch (e: any) {
    console.error('[CERCH:PEOPLE:ENRICH:BASIC] error', e?.message || e);
    return Response.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

