import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  crustPeopleProvider,
  isCrustConfigured,
  CrustdataError,
} from '@/lib/providers/crustdata/client';
import { sortPeopleByImage } from '@/lib/providers/sort';
import { buildPeopleSearchQuery, type PeopleFilterSpec } from '@/lib/providers/crustdata/people-filters';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    const body = await request.json();
    const { spec, cursor, limit = 50 } = body || {};
    if (!spec || !cursor) {
      return Response.json({ ok: false, error: 'Missing spec or cursor' }, { status: 400 });
    }
    if (!(await isCrustConfigured())) {
      return Response.json({ ok: false, error: 'Crustdata token is not configured' }, { status: 200 });
    }

    const query = buildPeopleSearchQuery(spec as PeopleFilterSpec, limit, '');
    (query as any).cursor = cursor;
    let result;
    try {
      result = await crustPeopleProvider.getPeople(query);
    } catch (error: any) {
      if (error instanceof CrustdataError) {
        return Response.json(
          {
            ok: false,
            error:
              error.status === 401 || error.status === 403
                ? 'Your Crustdata token is invalid or missing.'
                : error.message,
          },
          { status: error.status && error.status >= 400 ? error.status : 502 },
        );
      }
      console.error('[CERCH:PEOPLE:NEXT] unexpected error', error?.message || error);
      return Response.json({ ok: false, error: 'Crustdata pagination failed. Please retry.' }, { status: 502 });
    }
    if (!result.rows?.length) {
      return Response.json({ ok: false, error: 'No more profiles' }, { status: 200 });
    }
    const sorted = sortPeopleByImage(result.rows as any[]);
    return Response.json({ ok: true, rows: sorted, cursor: result.nextCursor ?? null }, { status: 200 });
  } catch (e: any) {
    console.error('[CERCH:PEOPLE:NEXT] error', e?.message || e);
    return Response.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
