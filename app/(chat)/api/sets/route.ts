import { auth } from '@/app/(auth)/auth';
import { getDocumentsByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:document').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '50');

    const docs = await getDocumentsByUserId({
      id: session.user.id,
      kinds: ['people', 'company'],
    });

    return Response.json(docs.slice(0, Math.max(1, Math.min(200, limit))));
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:api', 'Failed to load sets').toResponse();
  }
}

