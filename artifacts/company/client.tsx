import { Artifact } from '@/components/create-artifact';
import { CopyIcon, RedoIcon, UndoIcon } from '@/components/icons';
import { WebsetTable } from '@/components/webset-table';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';

type Metadata = any;

export const companyArtifact = new Artifact<'company', Metadata>({
  kind: 'company',
  description: 'Useful for exploring company results in a table.',
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
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        isVisible: true,
        status: 'streaming',
      }));
      setMetadata((m: any) => ({ ...(m || {}), statusText: String(streamPart.content || '') }));
    } else if (streamPart.type === 'error') {
      const errorMsg = String(streamPart.content || 'Failed to fetch company results');
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
  content: ({ content, status, metadata }) => {
    return (
      <div className="flex flex-col gap-2">
        {status === 'streaming' && (
          <div className="text-sm text-muted-foreground">
            {metadata?.statusText || 'Scanning companies and preparing your list…'}
          </div>
        )}
        {metadata?.errorMessage && !content && (
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
                  {metadata.errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}
        {content && (
          <WebsetTable
            csv={content}
            variant="company"
            autoHideEmptyColumns
            hideImageUrlColumns
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
