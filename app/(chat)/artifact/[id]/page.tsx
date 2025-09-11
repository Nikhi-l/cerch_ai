import { auth } from '@/app/(auth)/auth';
import { getChatIdByDocumentId, getDocumentsById } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { notFound, redirect } from 'next/navigation';
import { WebsetTable } from '@/components/webset-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { ArtifactViewerActions } from '@/components/artifact-viewer-actions';
import { SidebarToggle } from '@/components/sidebar-toggle';

export default async function ArtifactViewer({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  let documents: Awaited<ReturnType<typeof getDocumentsById>> = [];
  let dbError: string | null = null;
  try {
    documents = await getDocumentsById({ id });
  } catch (_) {
    dbError = 'Could not load this dataset due to a database error.';
  }
  if (!dbError && (!documents || documents.length === 0)) notFound();

  const latest = documents.at(-1)!;
  if (!dbError) {
    if (latest.userId !== session.user.id) {
      throw new ChatSDKError('forbidden:document');
    }
  }

  const isTabular = latest?.kind === 'people' || latest?.kind === 'company' || latest?.kind === 'webset';
  let chatId: string | null = null;
  try {
    chatId = latest ? await getChatIdByDocumentId({ id: latest.id }) : null;
  } catch (_) {
    chatId = null;
  }

  return (
    <>
      {/* Sidebar toggle in the same position as chat header */}
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2 z-10">
        <SidebarToggle />
      </header>
      <div className="flex w-full justify-center p-6 sm:p-10">
        <div className="w-full max-w-6xl flex flex-col gap-3 md:gap-4">
        {/* Unified header: title (left) + actions (right) aligned on one line */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-medium truncate">{latest.title}</h1>
          </div>
          <ArtifactViewerActions
            chatId={chatId}
            artifactId={latest.id}
            containerId="artifact-content"
            content={latest.content ?? ''}
            showBackIcon
            backHref="/dashboard"
          />
        </div>
        {dbError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-4 text-sm">
            {dbError}
          </div>
        ) : (
          <div id="artifact-content" className="relative rounded-xl border bg-card p-3 sm:p-4">
            {isTabular ? (
              <div className="p-2">
                <WebsetTable csv={latest.content ?? ''} variant={latest.kind as any} />
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Unsupported artifact viewer.</div>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
