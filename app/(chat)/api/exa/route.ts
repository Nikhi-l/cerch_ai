import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { resultsToCSV, searchExa } from '@/lib/exa';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const category = searchParams.get('category') ?? 'company';
  const numResults = Number(searchParams.get('numResults') || '10');

  if (!query) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter query is required.'
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  try {
    const results = await searchExa({ query, category, numResults });
    const csv = resultsToCSV(results);
    return Response.json({ csv }, { status: 200 });
  } catch (error: any) {
    return new ChatSDKError('bad_request:api', error.message).toResponse();
  }
}
