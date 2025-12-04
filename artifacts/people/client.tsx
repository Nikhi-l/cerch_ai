import { Artifact } from '@/components/create-artifact';
import { CopyIcon, RedoIcon, UndoIcon } from '@/components/icons';
import { WebsetTable } from '@/components/webset-table';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';

type Metadata = any;

export const peopleArtifact = new Artifact<'people', Metadata>({
  kind: 'people',
  description: 'Useful for exploring people results in a table.',
  initialize: async () => {},
  onStreamPart: ({ setArtifact, setMetadata, streamPart }) => {
    if (streamPart.type === 'sheet-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    } else if (streamPart.type === 'status') {
      // Do not auto-open on status; just update status text to avoid empty artifact opening
      setMetadata((m: any) => ({ ...(m || {}), statusText: String(streamPart.content || '') }));
    } else if (streamPart.type === 'error') {
      const errorMsg = String(streamPart.content || 'Failed to fetch people results');
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        status: 'idle',
        isVisible: true,
      }));
      try { toast.error(errorMsg); } catch {}
      setMetadata((m: any) => ({ ...(m || {}), statusText: '', errorMessage: errorMsg }));
    } else if (streamPart.type === 'finish') {
      setMetadata((m: any) => ({ ...(m || {}), statusText: '' }));
    }
  },
  content: ({ content, status, metadata, onSaveContent, setMetadata }) => {
    async function handleLoadMore() {
      try {
        const cursor = metadata?.cursor;
        const spec = metadata?.spec;
        const limit = metadata?.limit || 50;
        if (!cursor || !spec) return;
        const res = await fetch('/api/cerch/people/next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spec, cursor, limit }),
        });
        const json = await res.json();
        if (!json?.ok || !json?.rows?.length) {
          try { toast.error(json?.error || 'No more profiles'); } catch {}
          return;
        }
        // Append rows to current CSV
        const parsed = parse<string[]>(content || '', { skipEmptyLines: true });
        const headers = parsed.data[0] as string[];
        const dataRows = parsed.data.slice(1) as string[][];
        const newRows = (json.rows as any[]).map((r) => [
          r.name || '',
          r.title || '',
          r.company || '',
          r.industry || '',
          r.location || '',
          r.linkedin_url || '',
          r.website || '',
          r.profile_image_url || '',
          r.description || '',
          r.tags || '',
        ]);
        const combined = [headers, ...dataRows, ...newRows];
        const newCsv = unparse(combined);
        onSaveContent(newCsv, false);
        setMetadata((m: any) => ({ ...(m || {}), cursor: json.cursor ?? null }));
      } catch (e) {
        try { toast.error('Failed to load more results'); } catch {}
      }
    }

    // Check if content contains an error (saved as "ERROR\n{message}")
    const isError = content?.startsWith('ERROR\n');
    const errorContent = isError ? content.substring(6).replace(/^"|"$/g, '').replace(/""/g, '"') : null;

    return (
      <div className="flex flex-col gap-2">
        {status === 'streaming' && (
          <div className="text-sm text-muted-foreground">
            {metadata?.statusText || 'Searching profiles and preparing your list…'}
          </div>
        )}
        {(metadata?.errorMessage || errorContent) && !isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  Search Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                  {metadata.errorMessage || errorContent}
                </p>
              </div>
            </div>
          </div>
        )}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  Search Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                  {errorContent}
                </p>
              </div>
            </div>
          </div>
        )}
        {content && !isError && (
          <WebsetTable
            csv={content}
            variant="people"
            autoHideEmptyColumns
            hideImageUrlColumns
            onLoadMore={metadata?.cursor ? handleLoadMore : undefined}
            onSaveContent={onSaveContent}
          />
        )}
      </div>
    );
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon />,
      description: 'Copy as .csv',
      onClick: ({ content }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });

        const nonEmptyRows = parsed.data.filter((row) =>
          row.some((cell) => cell.trim() !== ''),
        );

        const cleanedCsv = unparse(nonEmptyRows);

        navigator.clipboard.writeText(cleanedCsv);
        toast.success('Copied csv to clipboard!');
      },
    },
  ],
  toolbar: [],
});
